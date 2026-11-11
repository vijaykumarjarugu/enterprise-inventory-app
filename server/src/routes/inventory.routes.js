import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { supabase } from '../db.js';

const router = Router();

// GET /api/v1/inventory (Objective 3: Retrieve all items from DB)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/inventory/:id (Objective 4: Individual item detail retrieval)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/inventory (Objective 2: Store record data securely in DB)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { sku, name, category, bin, qty, reorderPoint, description } = req.body;

    if (!sku || !name || !category || qty === undefined) {
      return res.status(400).json({
        success: false,
        message: 'SKU, name, category, and quantity are required'
      });
    }

    const calculatedStatus = Number(qty) <= (Number(reorderPoint) || 5) ? 'Low Stock' : 'Optimal';

    const { data, error } = await supabase
      .from('items')
      .insert([
        {
          sku,
          name,
          category,
          bin: bin || 'WH-General',
          qty: Number(qty),
          reorder_point: Number(reorderPoint) || 5,
          status: calculatedStatus,
          description: description || 'Catalog entry registered via persistent API.',
          created_by: req.user.username
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: 'Record persisted to PostgreSQL database',
      data
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;