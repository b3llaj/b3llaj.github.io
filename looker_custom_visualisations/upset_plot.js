looker.plugins.visualizations.add({
  // 1. Define configuration options visible in the Looker UI "Edit" tab
  options: {
    max_sets: {
      type: "number",
      label: "Max Topic Sets to Display",
      default: 10
    }
  },

  // 2. Initialize the chart container
  create: function(element, config) {
    element.innerHTML = "<div id='upset-container' style='width:100%; height:100%;'></div>";
  },

  // 3. Render and update the visualization when data changes
  updateAsync: function(data, element, config, queryResponse, details, done) {
    // Clear previous errors
    this.clearErrors();

    // Verify required dimensions/measures are present
    if (queryResponse.fields.dimensions.length === 0 || queryResponse.fields.measures.length === 0) {
      this.addError({
        title: "Incomplete Data",
        message: "Please select a combination dimension (e.g., Common Topics) and a measure (e.g., Prompt Count)."
      });
      return;
    }

    // Extract formatted data from queryResponse and data
    const container = document.getElementById("upset-container");
    container.innerHTML = ""; // Clear existing render

    // Transform Looker row format into the array structure expected by UpSet.js
    const formattedData = data.map(row => {
      const topicString = row[queryResponse.fields.dimensions[0].name].value || "";
      const count = row[queryResponse.fields.measures[0].name].value || 0;

      return {
        // Split delimited topics string (e.g., "EV, Pricing") into set arrays
        sets: topicString.split(",").map(t => t.trim()),
        count: count
      };
    });

    // Render using the UpSet.js library API
    // UpSetJS.renderCombinationChart(container, formattedData, { ... });

    done();
  }
});