import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

export const inventoryItems = [
  {
    id: 'item_1',
    sku: 'SKU-SRV-9012',
    name: 'Dell PowerEdge R750 Server',
    category: 'Compute Hardware',
    bin: 'WH-A / Rack-04B',
    qty: 14,
    reorderPoint: 10,
    status: 'Optimal',
    createdBy: 'admin'
  },
  {
    id: 'item_2',
    sku: 'SKU-NET-4401',
    name: 'Cisco Catalyst 9300 48-Port',
    category: 'Networking Devices',
    bin: 'WH-B / Bin-11A',
    qty: 4,
    reorderPoint: 8,
    status: 'Low Stock',
    createdBy: 'admin'
  }
];

// GET /api/v1/inventory (Fetch records)
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    count: inventoryItems.length,
    data: inventoryItems
  });
});

// POST /api/v1/inventory (Create new record - Protected route)
router.post('/', verifyToken, (req, res) => {
  try {
    const { sku, name, category, bin, qty, reorderPoint } = req.body;

    if (!sku || !name || !category || qty === undefined) {
      return res.status(400).json({
        success: false,
        message: 'SKU, name, category, and quantity are required'
      });
    }

    const newItem = {
      id: `item_${Date.now()}`,
      sku,
      name,
      category,
      bin: bin || 'Unassigned',
      qty: Number(qty),
      reorderPoint: Number(reorderPoint) || 5,
      status: Number(qty) <= (Number(reorderPoint) || 5) ? 'Low Stock' : 'Optimal',
      createdBy: req.user.username,
      createdAt: new Date().toISOString()
    };

    inventoryItems.unshift(newItem);

    return res.status(201).json({
      success: true,
      message: 'Inventory record created successfully',
      data: newItem
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;