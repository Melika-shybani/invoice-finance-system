import { Settings } from '../models/Settings.js';

export async function getSettings(req, res, next) {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    res.json({ success: true, data: settings.toJSON() });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const { sellerName, sellerEconomicCode, sellerNationalId, memoryCode, sim } = req.body;
    if (sellerName) settings.sellerName = sellerName.trim();
    if (sellerEconomicCode !== undefined) settings.sellerEconomicCode = sellerEconomicCode.trim();
    if (sellerNationalId !== undefined) settings.sellerNationalId = sellerNationalId.trim();
    if (memoryCode !== undefined) settings.memoryCode = memoryCode.trim().toUpperCase().slice(0, 6);

    if (sim) {
      if (sim.latencyMs !== undefined) settings.sim.latencyMs = Number(sim.latencyMs);
      if (sim.failRate !== undefined) settings.sim.failRate = Number(sim.failRate);
      if (sim.forceReject !== undefined) settings.sim.forceReject = Boolean(sim.forceReject);
    }

    await settings.save();
    res.json({
      success: true,
      message: 'تنظیمات سامانه با موفقیت به‌روزرسانی شد.',
      data: settings.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}
