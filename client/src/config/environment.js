const localFirebaseConfig = {
  projectId: "ai-notes",
};

// Simple check for development mode
const isDev = () => {
  // For React frontend
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    return true;
  }
  return false;
};

export { localFirebaseConfig, isDev };
