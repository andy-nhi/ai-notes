const localFirebaseConfig = {
  projectId: "ai-notes",
};

const isDev = () => {
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "development"
  ) {
    return true;
  }

  return false;
};

module.exports = { localFirebaseConfig, isDev };
