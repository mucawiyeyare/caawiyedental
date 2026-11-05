import DentalInventory from '../models/DentalInventory.js';
import DentalCategory from '../models/DentalCategory.js';
import { generateInventoryCode } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

export const getInventory = async (req, res, next) => {
  try {
    const { category, status, search } = req.query;
    let filter = { tenant_id: req.tenantId };

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { item_code: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
        { batch_lot_number: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await DentalInventory.find(filter).sort({ createdAt: -1 });

    // Calculate aggregated inventory statistics
    const totalItems = items.length;
    const totalValue = items.reduce((acc, item) => acc + (item.total_purchase_cost || 0), 0);
    const lowStockCount = items.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length;
    const expiredCount = items.filter(i => i.status === 'Expired').length;

    res.json({
      success: true,
      count: totalItems,
      metrics: {
        totalItems,
        totalValue,
        lowStockCount,
        expiredCount
      },
      data: items
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryById = async (req, res, next) => {
  try {
    const item = await DentalInventory.findOne({ _id: req.params.id, tenant_id: req.tenantId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const createInventoryItem = async (req, res, next) => {
  try {
    const itemCode = req.body.item_code || await generateInventoryCode(req.tenantId);

    const item = new DentalInventory({
      tenant_id: req.tenantId,
      item_code: itemCode,
      ...req.body
    });

    await item.save();

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'CREATE_INVENTORY_ITEM',
      entity: 'DentalInventory',
      entity_id: item._id,
      details: { name: item.name, quantity: item.quantity_purchased, supplier: item.supplier }
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const updateInventoryItem = async (req, res, next) => {
  try {
    let item = await DentalInventory.findOne({ _id: req.params.id, tenant_id: req.tenantId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    Object.assign(item, req.body);
    await item.save();

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'UPDATE_INVENTORY_ITEM',
      entity: 'DentalInventory',
      entity_id: item._id,
      details: { name: item.name, quantity_available: item.quantity_available }
    });

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const recordItemUsage = async (req, res, next) => {
  try {
    const { quantity_used, notes } = req.body;
    const item = await DentalInventory.findOne({ _id: req.params.id, tenant_id: req.tenantId });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const additionalUsed = Number(quantity_used) || 0;
    if (additionalUsed <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid quantity used (greater than 0).' });
    }

    const currentAvailable = Math.max(0, (item.quantity_purchased || 0) - (item.quantity_used || 0));
    if (additionalUsed > currentAvailable) {
      return res.status(400).json({
        success: false,
        message: `Cannot deduct ${additionalUsed} units. Only ${currentAvailable} units available in stock.`
      });
    }

    const newQuantityUsed = (item.quantity_used || 0) + additionalUsed;
    const newQuantityAvailable = Math.max(0, (item.quantity_purchased || 0) - newQuantityUsed);

    // Determine status
    let newStatus = 'In Stock';
    if (item.expiry_date && new Date(item.expiry_date) < new Date()) {
      newStatus = 'Expired';
    } else if (newQuantityAvailable === 0) {
      newStatus = 'Out of Stock';
    } else if (newQuantityAvailable <= (item.reorder_level || 5)) {
      newStatus = 'Low Stock';
    }

    const updatedNotes = notes && notes.trim()
      ? (item.notes ? `${item.notes}\n[Used ${additionalUsed} units on ${new Date().toLocaleDateString()}]: ${notes.trim()}` : `[Used ${additionalUsed} units on ${new Date().toLocaleDateString()}]: ${notes.trim()}`)
      : item.notes;

    const updatedItem = await DentalInventory.findOneAndUpdate(
      { _id: item._id, tenant_id: req.tenantId },
      {
        quantity_used: newQuantityUsed,
        quantity_available: newQuantityAvailable,
        status: newStatus,
        notes: updatedNotes
      },
      { new: true }
    );

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'RECORD_INVENTORY_USAGE',
      entity: 'DentalInventory',
      entity_id: item._id,
      details: { name: item.name, used: additionalUsed, remaining: updatedItem.quantity_available }
    });

    res.json({ success: true, message: 'Item usage recorded successfully', data: updatedItem });
  } catch (error) {
    console.error('Error in recordItemUsage:', error);
    res.status(500).json({ success: false, message: error.message || 'Error recording item usage' });
  }
};

export const deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await DentalInventory.findOneAndDelete({ _id: req.params.id, tenant_id: req.tenantId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'DELETE_INVENTORY_ITEM',
      entity: 'DentalInventory',
      entity_id: req.params.id,
      details: { name: item.name }
    });

    res.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// DENTAL CATEGORY CRUD CONTROLLERS (Doctor & Admin)
// ─────────────────────────────────────────────────────────────

export const getCategories = async (req, res, next) => {
  try {
    let categories = await DentalCategory.find({ tenant_id: req.tenantId }).sort({ name: 1 });
    if (categories.length === 0) {
      const defaultCategories = [
        'Dental Materials & Composites',
        'Orthodontic Supplies',
        'Surgical Instruments & Burs',
        'Anesthetics & Pharmaceuticals',
        'Diagnostic & X-Ray Supplies',
        'PPE & Sterilization',
        'Prosthodontic & Impression',
        'Equipment & Handpieces',
        'General Consumables'
      ];
      await DentalCategory.insertMany(defaultCategories.map(name => ({ tenant_id: req.tenantId, name })));
      categories = await DentalCategory.find({ tenant_id: req.tenantId }).sort({ name: 1 });
    }
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const existing = await DentalCategory.findOne({
      tenant_id: req.tenantId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A category with this name already exists' });
    }

    const category = await DentalCategory.create({
      tenant_id: req.tenantId,
      name: name.trim(),
      description: description?.trim() || '',
      created_by: req.user?._id
    });

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'CREATE_INVENTORY_CATEGORY',
      entity: 'DentalCategory',
      entity_id: category._id,
      details: { name: category.name }
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const category = await DentalCategory.findOne({ _id: req.params.id, tenant_id: req.tenantId });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const oldName = category.name;
    if (name && name.trim()) {
      category.name = name.trim();
    }
    if (description !== undefined) {
      category.description = description.trim();
    }

    await category.save();

    // If name changed, update items in inventory with oldName
    if (oldName !== category.name) {
      await DentalInventory.updateMany(
        { tenant_id: req.tenantId, category: oldName },
        { category: category.name }
      );
    }

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'UPDATE_INVENTORY_CATEGORY',
      entity: 'DentalCategory',
      entity_id: category._id,
      details: { oldName, newName: category.name }
    });

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await DentalCategory.findOneAndDelete({ _id: req.params.id, tenant_id: req.tenantId });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'DELETE_INVENTORY_CATEGORY',
      entity: 'DentalCategory',
      entity_id: req.params.id,
      details: { name: category.name }
    });

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};
