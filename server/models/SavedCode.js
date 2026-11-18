
import mongoose from "mongoose";

const savedCodeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    code: {
      type: String,
      required: true,
    },

    language: {
      type: String,
      required: true,
    },

    task: {
      type: String,
      default: "explain",
    },

    explanation: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const SavedCode = mongoose.model("SavedCode", savedCodeSchema);

export default SavedCode;
