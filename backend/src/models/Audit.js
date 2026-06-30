import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    collection: { type: String, required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'performedAt' } },
);

export const Audit = mongoose.model('Audit', auditSchema);
