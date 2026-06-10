(function attachDataLoader(root, factory) {
  const api = factory(root);
  root.AppData = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createDataLoader(root) {
  async function loadTrainees(fallbackTrainees = []) {
    try {
      const response = await fetch("./data/trainees.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load trainee data: ${response.status}`);
      }

      const trainees = await response.json();
      if (!Array.isArray(trainees)) {
        throw new Error("Trainee data must be an array.");
      }

      return trainees.map(root.AppLogic.normalizeTrainee);
    } catch (error) {
      console.warn(error);
      return fallbackTrainees.map(root.AppLogic.normalizeTrainee);
    }
  }

  return { loadTrainees };
});
