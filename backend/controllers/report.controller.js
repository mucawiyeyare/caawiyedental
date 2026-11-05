import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Treatment from '../models/Treatment.js';
import Consultation from '../models/Consultation.js';
import LabRequest from '../models/LabRequest.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Appointment from '../models/Appointment.js';
import Followup from '../models/Followup.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import DentalService from '../models/DentalService.js';
import Expense from '../models/Expense.js';
import Medicine from '../models/Medicine.js';
import Prescription from '../models/Prescription.js';
import { getDoctorAssignedPatientIds } from '../utils/doctorScope.js';

export const reconcileInvoicesAndPayments = async (tenantId) => {
  try {
    const tQuery = tenantId ? { tenant_id: tenantId } : {};
    // 1. Invoices with total_amount <= 0
    const zeroInvoices = await Invoice.find({ ...tQuery, total_amount: { $lte: 0 } });
    for (const inv of zeroInvoices) {
      let changed = false;
      if (inv.paid_amount !== 0) {
        inv.paid_amount = 0;
        changed = true;
      }
      if (inv.balance !== 0) {
        inv.balance = 0;
        changed = true;
      }
      if (inv.status !== 'Paid') {
        inv.status = 'Paid';
        changed = true;
      }
      if (changed) {
        await inv.save();
      }
      await Payment.deleteMany({ invoice_id: inv._id, ...(tenantId ? { tenant_id: tenantId } : {}) });
    }

    // 2. Invoices where paid_amount > total_amount
    const overpaidInvoices = await Invoice.find({ ...tQuery, $expr: { $gt: ['$paid_amount', '$total_amount'] } });
    for (const inv of overpaidInvoices) {
      inv.paid_amount = Math.max(0, inv.total_amount);
      inv.balance = 0;
      inv.status = 'Paid';
      await inv.save();

      const payments = await Payment.find({ invoice_id: inv._id, ...(tenantId ? { tenant_id: tenantId } : {}) }).sort({ payment_date: -1 });
      let allowed = inv.paid_amount;
      for (const p of payments) {
        if (allowed <= 0) {
          await Payment.findByIdAndDelete(p._id);
        } else if (p.amount > allowed) {
          p.amount = allowed;
          p.remaining_balance = 0;
          await p.save();
          allowed = 0;
        } else {
          allowed -= p.amount;
        }
      }
    }

    // 3. Remove orphan payments whose invoice no longer exists
    const allPayments = await Payment.find({ ...tQuery, invoice_id: { $exists: true, $ne: null } });
    for (const p of allPayments) {
      const invExists = await Invoice.exists({ _id: p.invoice_id });
      if (!invExists) {
        await Payment.findByIdAndDelete(p._id);
      }
    }
  } catch (err) {
    console.error('[Reconciliation Error]:', err);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    await reconcileInvoicesAndPayments(tenantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    // Target month handling (supports ?month=YYYY-MM)
    let targetYear = today.getFullYear();
    let targetMonth = today.getMonth(); // 0-indexed
    if (req.query.month) {
      const parts = req.query.month.split('-');
      if (parts.length === 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          targetYear = y;
          targetMonth = m - 1;
        }
      }
    }

    const targetMonthStart = new Date(targetYear, targetMonth, 1);
    const targetMonthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    const selectedMonthStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

    const isDoctor = req.user?.role === 'Doctor';
    const tenantFilter = tenantId ? { tenant_id: tenantId } : {};

    // ─────────────────────────────────────────────────────────────
    // DOCTOR-SPECIFIC DASHBOARD
    // ─────────────────────────────────────────────────────────────
    if (isDoctor) {
      const doctorId = req.user._id;
      const doctorUser = await User.findById(doctorId).populate('employee_id');
      const doctorEmployeeId = doctorUser?.employee_id?._id || doctorUser?.employee_id;
      const doctorIds = [doctorId, doctorEmployeeId].filter(Boolean);

      const assignedPatientIds = await getDoctorAssignedPatientIds(doctorId);
      const doctorVisitIds = await Visit.find({ ...tenantFilter, doctor_id: { $in: doctorIds } }).distinct('_id');
      const doctorInvoiceIds = await Invoice.find({
        ...tenantFilter,
        $or: [
          { doctor_id: { $in: doctorIds } },
          { visit_id: { $in: doctorVisitIds } }
        ]
      }).distinct('_id');

      const [
        totalPatientsServed,
        todayPatientsCount,
        pendingAppointmentsCount,
        todayAppointmentsCount,
        completedConsultationsCount,
        doctorMonthPayments,
        doctorDailyRevenueAgg,
        recentVisits,
        upcomingAppointments,
        recentTreatments,
        doctorTopServices,
        doctorPendingFollowups,
        doctorPendingFollowupsCount
      ] = await Promise.all([
        Promise.resolve(assignedPatientIds.length),

        Visit.countDocuments({
          ...tenantFilter,
          doctor_id: { $in: doctorIds },
          visit_date: { $gte: today, $lte: endToday }
        }),

        Appointment.countDocuments({
          ...tenantFilter,
          doctor_id: { $in: doctorIds },
          status: { $in: ['Scheduled', 'Confirmed', 'Pending'] }
        }),

        Appointment.countDocuments({
          ...tenantFilter,
          doctor_id: { $in: doctorIds },
          appointment_date: { $gte: today, $lte: endToday }
        }),

        Consultation.countDocuments({ ...tenantFilter, doctor_id: { $in: doctorIds } }),

        Payment.find({
          ...tenantFilter,
          $or: [
            { doctor_id: { $in: doctorIds } },
            { visit_id: { $in: doctorVisitIds } },
            { invoice_id: { $in: doctorInvoiceIds } }
          ],
          payment_date: { $gte: targetMonthStart, $lte: targetMonthEnd }
        }),

        Payment.aggregate([
          {
            $match: {
              ...(tenantId ? { tenant_id: tenantId } : {}),
              $or: [
                { doctor_id: { $in: doctorIds } },
                { visit_id: { $in: doctorVisitIds } },
                { invoice_id: { $in: doctorInvoiceIds } }
              ],
              payment_date: { $gte: targetMonthStart, $lte: targetMonthEnd }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$payment_date' } },
              total: { $sum: '$amount' }
            }
          },
          { $sort: { _id: 1 } }
        ]),

        Visit.find({ ...tenantFilter, doctor_id: { $in: doctorIds } })
          .sort({ visit_date: -1 })
          .limit(10)
          .populate('patient_id'),

        Appointment.find({
          ...tenantFilter,
          doctor_id: { $in: doctorIds },
          status: { $nin: ['Cancelled'] }
        })
          .sort({ appointment_date: -1 })
          .limit(6)
          .populate('patient_id'),

        Treatment.find({ ...tenantFilter, doctor_id: { $in: doctorIds } })
          .sort({ treatment_date: -1 })
          .limit(8)
          .populate('patient_id'),

        Treatment.aggregate([
          { $match: { ...(tenantId ? { tenant_id: tenantId } : {}), doctor_id: { $in: doctorIds } } },
          {
            $group: {
              _id: '$service_name',
              count: { $sum: 1 },
              totalRevenue: { $sum: '$price' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 6 }
        ]),

        Followup.find({
          ...tenantFilter,
          doctor_id: { $in: doctorIds },
          status: { $in: ['Pending', 'Scheduled', 'Rescheduled'] }
        })
          .sort({ followup_date: 1 })
          .limit(10)
          .populate('patient_id')
          .populate('visit_id'),

        Followup.countDocuments({
          ...tenantFilter,
          doctor_id: { $in: doctorIds },
          status: { $in: ['Pending', 'Scheduled', 'Rescheduled'] }
        })
      ]);

      const monthlyRevenue = doctorMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const rawName = doctorUser?.full_name || doctorUser?.username || 'Doctor';
      const cleanDoctorName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;

      return res.json({
        success: true,
        isDoctor: true,
        data: {
          doctor: {
            id: doctorId,
            name: cleanDoctorName,
            specialization: doctorUser?.employee_id?.specialization || 'Dental Surgeon',
            department: doctorUser?.employee_id?.department || 'Department of Dentistry',
            employee_id: doctorUser?.employee_id?.employee_id || ''
          },
          statistics: {
            patientsServed: totalPatientsServed,
            todayPatients: todayPatientsCount,
            pendingAppointments: pendingAppointmentsCount,
            todayAppointments: todayAppointmentsCount,
            completedConsultations: completedConsultationsCount,
            pendingFollowups: doctorPendingFollowupsCount,
            monthlyRevenue: monthlyRevenue,
            selectedMonth: selectedMonthStr
          },
          recentPatients: recentVisits,
          upcomingAppointments: upcomingAppointments,
          pendingFollowups: doctorPendingFollowups,
          recentTreatments: recentTreatments,
          topServices: doctorTopServices,
          dailyRevenue: doctorDailyRevenueAgg
        }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CLINIC-WIDE ADMIN / CASHIER DASHBOARD
    // ─────────────────────────────────────────────────────────────
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const endYesterday = new Date(yesterday);
    endYesterday.setHours(23, 59, 59, 999);

    const [
      totalPatients,
      todayPatients,
      monthPatients,
      totalVisits,
      todayVisits,
      waitingForDoctor,
      withDoctor,
      labPending,
      paymentPending,
      todayAppointments,
      totalAppointments,
      allPayments,
      todayPayments,
      monthPayments,
      allUnpaidInvoices,
      totalEmployees,
      activeEmployees,
      topTreatmentsAgg,
      dailyRevenueAgg,
      monthlyRevenueAgg,
      yesterdayPayments,
      yesterdayVisits,
      yesterdayAppointments,
      thirtyDaysRevenueAgg,
      hourlySalesAgg,
      categoryBreakdownAgg
    ] = await Promise.all([
      Patient.countDocuments(tenantFilter),
      Patient.countDocuments({ ...tenantFilter, createdAt: { $gte: today, $lte: endToday } }),
      Patient.countDocuments({ ...tenantFilter, createdAt: { $gte: targetMonthStart, $lte: targetMonthEnd } }),
      Visit.countDocuments(tenantFilter),
      Visit.countDocuments({ ...tenantFilter, visit_date: { $gte: today, $lte: endToday } }),
      Visit.countDocuments({ ...tenantFilter, status: { $in: ['Waiting for Doctor', 'Returning to Doctor'] } }),
      Visit.countDocuments({ ...tenantFilter, status: { $in: ['With Doctor', 'Treatment in Progress'] } }),
      LabRequest.countDocuments({ ...tenantFilter, status: { $in: ['Pending', 'Payment Required', 'Paid', 'Sample Collected', 'Testing'] } }),
      Visit.countDocuments({ ...tenantFilter, status: { $in: ['Waiting for Payment', 'Laboratory Payment Required', 'Payment Pending'] } }),
      Appointment.countDocuments({ ...tenantFilter, appointment_date: { $gte: today, $lte: endToday } }),
      Appointment.countDocuments(tenantFilter),
      Payment.find(tenantFilter),
      Payment.find({ ...tenantFilter, payment_date: { $gte: today, $lte: endToday } }),
      Payment.find({ ...tenantFilter, payment_date: { $gte: targetMonthStart, $lte: targetMonthEnd } }),
      Invoice.find({ ...tenantFilter, balance: { $gt: 0 } }),
      Employee.countDocuments(tenantFilter),
      Employee.countDocuments({ ...tenantFilter, status: 'Active' }),
      Treatment.aggregate([
        { $match: { ...(tenantId ? { tenant_id: tenantId } : {}) } },
        {
          $group: {
            _id: '$service_name',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$price' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ]),
      Payment.aggregate([
        {
          $match: {
            ...(tenantId ? { tenant_id: tenantId } : {}),
            payment_date: { $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$payment_date' } },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Payment.aggregate([
        {
          $match: {
            ...(tenantId ? { tenant_id: tenantId } : {}),
            payment_date: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$payment_date' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Payment.find({ ...tenantFilter, payment_date: { $gte: yesterday, $lte: endYesterday } }),
      Visit.countDocuments({ ...tenantFilter, visit_date: { $gte: yesterday, $lte: endYesterday } }),
      Appointment.countDocuments({ ...tenantFilter, appointment_date: { $gte: yesterday, $lte: endYesterday } }),
      Payment.aggregate([
        {
          $match: {
            ...(tenantId ? { tenant_id: tenantId } : {}),
            payment_date: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$payment_date' } },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Payment.aggregate([
        {
          $match: {
            ...(tenantId ? { tenant_id: tenantId } : {}),
            payment_date: { $gte: today, $lte: endToday }
          }
        },
        {
          $group: {
            _id: { $hour: '$payment_date' },
            consultations: {
              $sum: { $cond: [{ $eq: ['$payment_category', 'Consultation Fee'] }, '$amount', 0] }
            },
            treatments: {
              $sum: { $cond: [{ $eq: ['$payment_category', 'Dental Treatment'] }, '$amount', 0] }
            },
            services: {
              $sum: {
                $cond: [
                  { $in: ['$payment_category', ['Laboratory Fee', 'Pharmacy Fee', 'Final Bill / Consolidated', 'Partial Payment']] },
                  '$amount',
                  0
                ]
              }
            },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      DentalService.aggregate([
        { $match: { ...(tenantId ? { tenant_id: tenantId } : {}) } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    const monthRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = allUnpaidInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

    const yesterdayRevenue = yesterdayPayments.reduce((sum, p) => sum + p.amount, 0);
    const todayProfit = todayRevenue * 0.72;
    const yesterdayProfit = yesterdayRevenue * 0.72;

    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const diff = ((curr - prev) / prev) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    const newPatientsCount = await Patient.countDocuments({ ...tenantFilter, createdAt: { $gte: thirtyDaysAgo } });
    const returningPatientsCount = Math.max(0, totalPatients - newPatientsCount);

    res.json({
      success: true,
      isDoctor: false,
      data: {
        patients: {
          total: totalPatients,
          today: todayPatients,
          month: monthPatients,
          newPatients: newPatientsCount,
          returningPatients: returningPatientsCount
        },
        visits: {
          total: totalVisits,
          today: todayVisits,
          waitingForDoctor,
          withDoctor,
          labPending,
          paymentPending
        },
        appointments: {
          today: todayAppointments,
          total: totalAppointments
        },
        financials: {
          totalRevenue,
          todayRevenue,
          monthRevenue,
          todayProfit,
          totalOutstanding,
          unpaidInvoicesCount: allUnpaidInvoices.length,
          selectedMonth: selectedMonthStr
        },
        trends: {
          revenue: calcTrend(todayRevenue, yesterdayRevenue),
          revenuePositive: todayRevenue >= yesterdayRevenue,
          patients: calcTrend(todayVisits, yesterdayVisits),
          patientsPositive: todayVisits >= yesterdayVisits,
          profit: calcTrend(todayProfit, yesterdayProfit),
          profitPositive: todayProfit >= yesterdayProfit,
          appointments: calcTrend(todayAppointments, yesterdayAppointments),
          appointmentsPositive: todayAppointments >= yesterdayAppointments
        },
        hourlyRevenue: hourlySalesAgg,
        thirtyDaysRevenue: thirtyDaysRevenueAgg,
        categories: categoryBreakdownAgg,
        chairCapacity: {
          chair1: {
            booked: waitingForDoctor + withDoctor,
            total: 16,
            pct: Math.min(100, Math.round(((waitingForDoctor + withDoctor) / 16) * 100))
          },
          chair2: {
            booked: todayAppointments,
            total: 15,
            pct: Math.min(100, Math.round((todayAppointments / 15) * 100))
          },
          surgery: {
            booked: withDoctor,
            total: 7,
            pct: Math.min(100, Math.round((withDoctor / 7) * 100))
          }
        },
        employees: {
          total: totalEmployees,
          active: activeEmployees
        },
        topTreatments: topTreatmentsAgg,
        dailyRevenue: dailyRevenueAgg,
        monthlyRevenue: monthlyRevenueAgg
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorPerformanceReport = async (req, res, next) => {
  try {
    const tenantFilter = req.tenantId ? { tenant_id: req.tenantId } : {};
    const doctors = await User.find({ ...tenantFilter, role: 'Doctor' }).populate('employee_id');

    const performance = await Promise.all(
      doctors.map(async (doc) => {
        const [patientVisits, treatments, labRequests] = await Promise.all([
          Visit.countDocuments({ ...tenantFilter, doctor_id: doc._id }),
          Treatment.find({ ...tenantFilter, doctor_id: doc._id }),
          LabRequest.countDocuments({ ...tenantFilter, doctor_id: doc._id })
        ]);

        const totalTreatmentRevenue = treatments.reduce((sum, t) => sum + (t.price || 0), 0);

        return {
          doctorId: doc._id,
          name: doc.full_name || doc.username,
          specialization: doc.employee_id?.specialization || 'Dental Surgeon',
          patientsSeen: patientVisits,
          proceduresCount: treatments.length,
          treatmentRevenue: totalTreatmentRevenue,
          labRequestsCount: labRequests
        };
      })
    );

    res.json({ success: true, data: performance });
  } catch (error) {
    next(error);
  }
};

export const getServiceAnalytics = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const matchTenant = tenantId ? { tenant_id: tenantId } : {};

    const [serviceAggregation, labAggregation, paymentMethodAgg, paymentCategoryAgg] = await Promise.all([
      Treatment.aggregate([
        { $match: matchTenant },
        {
          $group: {
            _id: '$service_name',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$price' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      LabRequest.aggregate([
        { $match: matchTenant },
        {
          $group: {
            _id: '$test_name',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$price' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Payment.aggregate([
        { $match: matchTenant },
        {
          $group: {
            _id: '$payment_method',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),
      Payment.aggregate([
        { $match: matchTenant },
        {
          $group: {
            _id: '$payment_category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        topServices: serviceAggregation,
        topLabTests: labAggregation,
        paymentMethods: paymentMethodAgg,
        paymentCategories: paymentCategoryAgg
      }
    });
  } catch (error) {
    next(error);
  }
};

export const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({
        success: true,
        data: { patients: [], invoices: [], visits: [], services: [] }
      });
    }

    const query = q.trim();
    const regex = new RegExp(query, 'i');
    const isDoctor = req.user?.role === 'Doctor';
    const tenantFilter = req.tenantId ? { tenant_id: req.tenantId } : {};

    let patientScope = { ...tenantFilter };
    let visitScope = { ...tenantFilter };
    let invoiceScope = { ...tenantFilter };

    if (isDoctor) {
      const assignedPatientIds = await getDoctorAssignedPatientIds(req.user._id);
      patientScope._id = { $in: assignedPatientIds };
      visitScope.doctor_id = req.user._id;
      invoiceScope.doctor_id = req.user._id;
    }

    const [patients, invoices, visits, services] = await Promise.all([
      Patient.find({
        ...patientScope,
        $or: [
          { name: regex },
          { patient_number: regex },
          { telephone: regex }
        ]
      })
        .limit(5)
        .select('name patient_number telephone gender'),

      Invoice.find({
        ...invoiceScope,
        $or: [
          { invoice_number: regex }
        ]
      })
        .limit(5)
        .populate('patient_id', 'name patient_number')
        .select('invoice_number total_amount balance status patient_id'),

      Visit.find({
        ...visitScope,
        $or: [
          { visit_number: regex },
          { reason: regex }
        ]
      })
        .limit(5)
        .populate('patient_id', 'name patient_number')
        .select('visit_number reason status visit_date patient_id'),

      DentalService.find({
        ...tenantFilter,
        $or: [
          { service_name: regex },
          { category: regex },
          { service_code: regex }
        ]
      })
        .limit(5)
        .select('service_name category price service_code')
    ]);

    res.json({
      success: true,
      data: {
        patients,
        invoices,
        visits,
        services
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDailyIncomeReport = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    await reconcileInvoicesAndPayments(tenantId);

    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
    const tenantFilter = tenantId ? { tenant_id: tenantId } : {};

    // 1. All Payments collected on that day
    const payments = await Payment.find({
      ...tenantFilter,
      payment_date: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate('patient_id', 'name patient_number telephone')
      .populate('doctor_id', 'full_name username')
      .populate('invoice_id', 'invoice_number items total_amount discount balance status')
      .populate('received_by', 'full_name username')
      .sort({ payment_date: -1 });

    let totalIncome = 0;
    let cashIncome = 0;
    let cardIncome = 0;
    let mobileIncome = 0;
    let bankIncome = 0;
    let otherIncome = 0;

    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      totalIncome += amt;
      const method = (p.payment_method || 'Cash').toLowerCase();
      if (method.includes('cash')) {
        cashIncome += amt;
      } else if (method.includes('card') || method.includes('credit') || method.includes('debit')) {
        cardIncome += amt;
      } else if (method.includes('mobile') || method.includes('evc') || method.includes('zaad') || method.includes('sahal')) {
        mobileIncome += amt;
      } else if (method.includes('bank') || method.includes('transfer')) {
        bankIncome += amt;
      } else {
        otherIncome += amt;
      }
    }

    // 2. Invoices generated on that day
    const dayInvoices = await Invoice.find({
      ...tenantFilter,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const discountsGiven = dayInvoices.reduce((sum, inv) => sum + (Number(inv.discount) || 0), 0);
    const outstandingToday = dayInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
    const paidInvoicesCount = payments.filter(p => p.invoice_id?.status === 'Paid').length;

    // 3. Structured detailed transactions table
    const transactions = payments.map(p => {
      const inv = p.invoice_id;
      const serviceNames = inv?.items?.map(it => it.description || it.item_type).join(', ') || p.payment_category || 'Dental Consultation & Service';
      const grossAmt = (Number(p.amount) || 0) + (Number(inv?.discount) || 0);

      return {
        payment_id: p._id,
        receipt_number: p.receipt_number,
        payment_date: p.payment_date,
        patient_name: p.patient_id?.name || 'Walk-in Patient',
        patient_number: p.patient_id?.patient_number || 'PAT-N/A',
        patient_phone: p.patient_id?.telephone || 'N/A',
        invoice_number: inv?.invoice_number || 'INV-DIRECT',
        service_names: serviceNames,
        doctor_name: p.doctor_id?.full_name ? `Dr. ${p.doctor_id.full_name}` : 'Clinic Staff',
        payment_method: p.payment_method || 'Cash',
        payment_category: p.payment_category || 'Dental Service',
        gross_amount: Number(grossAmt.toFixed(2)),
        discount: Number((inv?.discount || 0).toFixed(2)),
        final_paid_amount: Number((p.amount || 0).toFixed(2)),
        payment_status: inv?.status || 'Paid',
        cashier_name: p.received_by?.full_name || p.received_by?.username || 'Cashier'
      };
    });

    res.json({
      success: true,
      data: {
        date: startOfDay.toISOString().split('T')[0],
        formatted_date: startOfDay.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        summary: {
          total_income: Number(totalIncome.toFixed(2)),
          cash_income: Number(cashIncome.toFixed(2)),
          card_income: Number(cardIncome.toFixed(2)),
          mobile_income: Number(mobileIncome.toFixed(2)),
          bank_income: Number(bankIncome.toFixed(2)),
          other_income: Number(otherIncome.toFixed(2)),
          transactions_count: payments.length,
          paid_invoices_count: paidInvoicesCount,
          outstanding_today: Number(outstandingToday.toFixed(2)),
          discounts_given: Number(discountsGiven.toFixed(2)),
          refunds: 0.00
        },
        transactions
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getFinancialSummaryReport = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    await reconcileInvoicesAndPayments(tenantId);
    const tenantFilter = tenantId ? { tenant_id: tenantId } : {};

    const targetYear = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    const prevYear = targetYear - 1;

    const startOfYear = new Date(targetYear, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const startOfPrevYear = new Date(prevYear, 0, 1, 0, 0, 0, 0);
    const endOfPrevYear = new Date(prevYear, 11, 31, 23, 59, 59, 999);

    const [
      yearPayments,
      prevYearPayments,
      yearExpenses,
      prevYearExpenses,
      yearInvoices,
      yearPatients
    ] = await Promise.all([
      Payment.find({ ...tenantFilter, payment_date: { $gte: startOfYear, $lte: endOfYear } }).populate('doctor_id', 'full_name username'),
      Payment.find({ ...tenantFilter, payment_date: { $gte: startOfPrevYear, $lte: endOfPrevYear } }),
      Expense.find({ ...tenantFilter, expense_date: { $gte: startOfYear, $lte: endOfYear } }),
      Expense.find({ ...tenantFilter, expense_date: { $gte: startOfPrevYear, $lte: endOfPrevYear } }),
      Invoice.find({ ...tenantFilter, createdAt: { $gte: startOfYear, $lte: endOfYear } }),
      Patient.find({ ...tenantFilter, createdAt: { $gte: startOfYear, $lte: endOfYear } })
    ]);

    const totalCollected = yearPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const prevTotalCollected = prevYearPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalExpenses = yearExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const prevTotalExpenses = prevYearExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netIncome = totalCollected - totalExpenses;
    const prevNetIncome = prevTotalCollected - prevTotalExpenses;

    const grossInvoiced = yearInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const outstandingBalances = yearInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const totalDiscounts = yearInvoices.reduce((sum, inv) => sum + (inv.discount || 0), 0);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyBreakdown = monthNames.map((name, mIdx) => {
      const mPayments = yearPayments.filter(p => new Date(p.payment_date).getMonth() === mIdx);
      const mExpenses = yearExpenses.filter(e => new Date(e.expense_date).getMonth() === mIdx);
      const mInvoices = yearInvoices.filter(inv => new Date(inv.createdAt).getMonth() === mIdx);
      const mPatients = yearPatients.filter(pat => new Date(pat.createdAt).getMonth() === mIdx);

      const mCollected = mPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const mExp = mExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const mNet = mCollected - mExp;
      const mOut = mInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
      const mDisc = mInvoices.reduce((sum, inv) => sum + (inv.discount || 0), 0);

      return {
        month: name,
        month_index: mIdx + 1,
        collected_revenue: Number(mCollected.toFixed(2)),
        total_expenses: Number(mExp.toFixed(2)),
        net_income: Number(mNet.toFixed(2)),
        outstanding_balances: Number(mOut.toFixed(2)),
        discounts: Number(mDisc.toFixed(2)),
        invoices_count: mInvoices.length,
        patients_count: mPatients.length
      };
    });

    const payMethodMap = {};
    for (const p of yearPayments) {
      const m = p.payment_method || 'Cash';
      payMethodMap[m] = (payMethodMap[m] || 0) + (p.amount || 0);
    }
    const paymentMethodBreakdown = Object.keys(payMethodMap).map(method => ({
      method,
      amount: Number(payMethodMap[method].toFixed(2)),
      percentage: Number(((payMethodMap[method] / (totalCollected || 1)) * 100).toFixed(1))
    })).sort((a, b) => b.amount - a.amount);

    const doctorRevenueMap = {};
    for (const p of yearPayments) {
      const docName = p.doctor_id?.full_name || p.doctor_id?.username || 'Clinic House Doctor';
      doctorRevenueMap[docName] = (doctorRevenueMap[docName] || 0) + (p.amount || 0);
    }
    const doctorIncomeBreakdown = Object.keys(doctorRevenueMap).map(doc => ({
      doctor: doc,
      revenue: Number(doctorRevenueMap[doc].toFixed(2)),
      percentage: Number(((doctorRevenueMap[doc] / (totalCollected || 1)) * 100).toFixed(1))
    })).sort((a, b) => b.revenue - a.revenue);

    const expCatMap = {};
    for (const e of yearExpenses) {
      const cat = e.category || 'Other Expenses';
      expCatMap[cat] = (expCatMap[cat] || 0) + (e.amount || 0);
    }
    const expenseCategoryBreakdown = Object.keys(expCatMap).map(cat => ({
      category: cat,
      amount: Number(expCatMap[cat].toFixed(2)),
      percentage: Number(((expCatMap[cat] / (totalExpenses || 1)) * 100).toFixed(1))
    })).sort((a, b) => b.amount - a.amount);

    res.json({
      success: true,
      data: {
        year: targetYear,
        summary: {
          gross_revenue: Number(grossInvoiced.toFixed(2)),
          collected_revenue: Number(totalCollected.toFixed(2)),
          outstanding_revenue: Number(outstandingBalances.toFixed(2)),
          total_expenses: Number(totalExpenses.toFixed(2)),
          net_income: Number(netIncome.toFixed(2)),
          total_discounts: Number(totalDiscounts.toFixed(2)),
          total_refunds: 0.00,
          total_invoices: yearInvoices.length,
          total_patients: yearPatients.length,
          yoy_growth: Number((((totalCollected - prevTotalCollected) / (prevTotalCollected || 1)) * 100).toFixed(1))
        },
        previous_year: {
          year: prevYear,
          collected_revenue: Number(prevTotalCollected.toFixed(2)),
          total_expenses: Number(prevTotalExpenses.toFixed(2)),
          net_income: Number(prevNetIncome.toFixed(2))
        },
        monthly_breakdown: monthlyBreakdown,
        payment_methods: paymentMethodBreakdown,
        doctor_income: doctorIncomeBreakdown,
        expense_categories: expenseCategoryBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDentalTreatmentAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, doctorId } = req.query;
    let filter = req.tenantId ? { tenant_id: req.tenantId } : {};

    if (doctorId) filter.doctor_id = doctorId;
    if (startDate || endDate) {
      filter.treatment_date = {};
      if (startDate) filter.treatment_date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.treatment_date.$lte = end;
      }
    }

    const treatments = await Treatment.find(filter)
      .populate('patient_id', 'name patient_number')
      .populate('doctor_id', 'full_name username')
      .populate('service_id', 'service_name category price service_code')
      .sort({ treatment_date: -1 });

    const PROCEDURE_MAP = {
      'Examination & Consultation': ['consultation', 'check-up', 'examination', 'checkup', 'exam'],
      'Cleaning (Scaling & Polishing)': ['cleaning', 'scaling', 'polishing', 'prophy'],
      'Tooth Filling (Composite Restorations)': ['filling', 'composite', 'restoration', 'gic'],
      'Tooth Extraction (Simple & Surgical)': ['extraction', 'surgical extraction', 'tooth removal', 'pull'],
      'Root Canal Treatment (RCT)': ['root canal', 'rct', 'pulpectomy', 'endodontic'],
      'Crown & Bridge Restorations': ['crown', 'bridge', 'zirconia', 'porcelain'],
      'Dental Implants': ['implant', 'implantology', 'abutment'],
      'Dentures (Acrylic & Cast)': ['denture', 'acrylic', 'complete denture', 'partial denture'],
      'Orthodontics (Braces & Aligners)': ['orthodontic', 'braces', 'aligner', 'retainer'],
      'Teeth Whitening': ['whitening', 'bleaching'],
      'Other Dental Procedures': []
    };

    const analyticsStats = {};
    for (const group of Object.keys(PROCEDURE_MAP)) {
      analyticsStats[group] = {
        procedure_name: group,
        count: 0,
        total_revenue: 0,
        doctors: {}
      };
    }

    for (const t of treatments) {
      const srvName = (t.service_id?.service_name || t.description || 'Dental Procedure').toLowerCase();
      const srvCat = (t.service_id?.category || '').toLowerCase();
      const cost = Number(t.cost) || Number(t.service_id?.price) || 0;
      const docName = t.doctor_id?.full_name || t.doctor_id?.username || 'Doctor';

      let matchedGroup = 'Other Dental Procedures';
      for (const [group, keywords] of Object.entries(PROCEDURE_MAP)) {
        if (group === 'Other Dental Procedures') continue;
        if (keywords.some(k => srvName.includes(k) || srvCat.includes(k))) {
          matchedGroup = group;
          break;
        }
      }

      analyticsStats[matchedGroup].count += 1;
      analyticsStats[matchedGroup].total_revenue += cost;
      analyticsStats[matchedGroup].doctors[docName] = (analyticsStats[matchedGroup].doctors[docName] || 0) + 1;
    }

    const procedureBreakdown = Object.values(analyticsStats).map(p => ({
      procedure_name: p.procedure_name,
      count: p.count,
      total_revenue: Number(p.total_revenue.toFixed(2)),
      avg_price: p.count > 0 ? Number((p.total_revenue / p.count).toFixed(2)) : 0,
      top_doctor: Object.entries(p.doctors).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
    })).sort((a, b) => b.count - a.count);

    const totalTreatmentsCount = treatments.length;
    const totalTreatmentRevenue = procedureBreakdown.reduce((sum, p) => sum + p.total_revenue, 0);

    res.json({
      success: true,
      data: {
        total_treatments: totalTreatmentsCount,
        total_revenue: Number(totalTreatmentRevenue.toFixed(2)),
        procedure_breakdown: procedureBreakdown,
        recent_treatments: treatments.slice(0, 20)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMedicationReport = async (req, res, next) => {
  try {
    const tenantFilter = req.tenantId ? { tenant_id: req.tenantId } : {};
    const medicines = await Medicine.find(tenantFilter).sort({ name: 1 });
    const prescriptions = await Prescription.find(tenantFilter).populate('doctor_id', 'full_name');

    let totalCatalogCostValue = 0;
    let totalCatalogSalesValue = 0;
    let totalStockUnits = 0;

    const medUsageMap = {};
    for (const rx of prescriptions) {
      if (rx.items && Array.isArray(rx.items)) {
        for (const it of rx.items) {
          const key = it.medicine_name || 'Other';
          if (!medUsageMap[key]) {
            medUsageMap[key] = {
              quantity_prescribed: 0,
              quantity_dispensed: 0,
              total_revenue: 0
            };
          }
          medUsageMap[key].quantity_prescribed += (it.quantity || 1);
          if (it.is_purchased || it.status === 'Dispensed') {
            medUsageMap[key].quantity_dispensed += (it.quantity || 1);
            medUsageMap[key].total_revenue += (it.total_price || 0);
          }
        }
      }
    }

    const itemsReport = medicines.map(m => {
      const cost = Number(m.cost_price) || 1.00;
      const price = Number(m.unit_price) || 2.00;
      const stock = Number(m.stock_quantity) || 0;
      const usage = medUsageMap[m.name] || { quantity_prescribed: 0, quantity_dispensed: 0, total_revenue: 0 };

      const totalItemCost = Number((stock * cost).toFixed(2));
      const totalItemSalesPotential = Number((stock * price).toFixed(2));

      totalCatalogCostValue += totalItemCost;
      totalCatalogSalesValue += totalItemSalesPotential;
      totalStockUnits += stock;

      return {
        _id: m._id,
        medicine_code: m.medicine_code,
        name: m.name,
        generic_name: m.generic_name,
        category: m.category,
        dosage_form: m.dosage_form,
        is_injection: Boolean(m.is_injection),
        batch_number: m.batch_number || 'LOT-2026',
        expiry_date: m.expiry_date,
        cost_price: cost,
        unit_price: price,
        current_stock: stock,
        reorder_level: m.reorder_level || 20,
        quantity_dispensed: usage.quantity_dispensed,
        total_dispensed_revenue: Number(usage.total_revenue.toFixed(2)),
        total_inventory_cost: totalItemCost
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          total_distinct_medicines: medicines.length,
          total_stock_units: totalStockUnits,
          total_inventory_cost: Number(totalCatalogCostValue.toFixed(2)),
          total_sales_value: Number(totalCatalogSalesValue.toFixed(2)),
          low_stock_count: medicines.filter(m => m.stock_quantity <= (m.reorder_level || 20)).length,
          expiring_soon_count: medicines.filter(m => m.expiry_date && new Date(m.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length
        },
        medications: itemsReport
      }
    });
  } catch (error) {
    next(error);
  }
};
