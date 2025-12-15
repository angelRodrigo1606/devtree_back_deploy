import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProfileView extends Document {
  profile: Types.ObjectId;
  fingerprint: string;
  day: string; // YYYY-MM-DD
}

const profileViewSchema = new Schema(
  {
    profile: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fingerprint: {
      type: String,
      required: true,
      index: true,
    },
    day: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// 1 visita por fingerprint por día
profileViewSchema.index({ profile: 1, fingerprint: 1, day: 1 }, { unique: true });

const ProfileView = mongoose.model<IProfileView>("ProfileView", profileViewSchema);
export default ProfileView;
