import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { supabase } from '../db.js';

const router = Router();

// GET /api/v1/inventory (Read all + Optional Search & Category filters)
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;

    let query = supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,bin.ilike.%${term}%`);
    }

    const { data, error } = await query;

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

// GET /api/v1/inventory/:id (Read single record details)
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

// POST /api/v1/inventory (Create new record)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { sku, name, category, bin, qty, reorderPoint, reorder_point, description } = req.body;

    if (!sku || !name || !category || qty === undefined) {
      return res.status(400).json({
        success: false,
        message: 'SKU, name, category, and quantity are required'
      });
    }

    const finalReorderPoint = Number(reorderPoint ?? reorder_point ?? 5);
    const calculatedStatus = Number(qty) <= finalReorderPoint ? 'Low Stock' : 'Optimal';

    const { data, error } = await supabase
      .from('items')
      .insert([
        {
          sku,
          name,
          category,
          bin: bin || 'WH-General',
          qty: Number(qty),
          reorder_point: finalReorderPoint,
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

// PUT /api/v1/inventory/:id (Update existing record)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, name, category, bin, qty, reorderPoint, reorder_point, description } = req.body;

    // Fetch existing record to merge partial updates cleanly
    const { data: existing, error: fetchError } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    const updatedQty = qty !== undefined ? Number(qty) : existing.qty;
    const updatedReorder =
      reorderPoint !== undefined || reorder_point !== undefined
        ? Number(reorderPoint ?? reorder_point)
        : existing.reorder_point;

    const calculatedStatus = updatedQty <= updatedReorder ? 'Low Stock' : 'Optimal';

    const { data, error } = await supabase
      .from('items')
      .update({
        sku: sku ?? existing.sku,
        name: name ?? existing.name,
        category: category ?? existing.category,
        bin: bin ?? existing.bin,
        qty: updatedQty,
        reorder_point: updatedReorder,
        status: calculatedStatus,
        description: description ?? existing.description
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Record updated in PostgreSQL database',
      data
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/inventory/:id (Delete existing record)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Record not found or already deleted'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Record deleted from PostgreSQL database',
      data
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;