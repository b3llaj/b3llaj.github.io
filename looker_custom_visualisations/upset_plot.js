looker.plugins.visualizations.add({
  options: {
    max_sets: {
      type: "number",
      label: "Max Topic Sets to Display",
      default: 10
    }
  },

  create: function(element, config) {
    element.innerHTML = "<div id='upset-container' style='width:100%; height:100%;'></div>";
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    this.clearErrors();

    if (queryResponse.fields.dimensions.length === 0 || queryResponse.fields.measures.length === 0) {
      this.addError({
        title: "Incomplete Data",
        message: "Please select a combination dimension (e.g., Common Topics) and a measure (e.g., Prompt Count)."
      });
      return;
    }

    const container = document.getElementById("upset-container");
    container.innerHTML = "";

    const formattedData = data.map(row => {
      const topicVal = row[queryResponse.fields.dimensions[0].name].value;
      let setsArray = [];

      // Handle both raw string arrays from Looker and comma-separated strings
      if (Array.isArray(topicVal)) {
        setsArray = topicVal;
      } else if (typeof topicVal === 'string') {
        try {
          // If it's a JSON string representation of an array
          setsArray = JSON.parse(topicVal);
        } catch (e) {
          // Fallback to comma-split if plain text
          setsArray = topicVal.split(",").map(t => t.trim());
        }
      }

      return {
        sets: setsArray,
        count: row[queryResponse.fields.measures[0].name].value || 0
      };
    });

    try {
      const sets = UpSetJS.extractSets(formattedData);
      UpSetJS.render(container, {
        sets: sets,
        width: element.clientWidth,
        height: element.clientHeight,
        combinations: {
          type: 'intersection',
          min: 1,
          limit: config.max_sets || 10,
          order: 'cardinality'
        }
      });
    } catch (err) {
      this.addError({
        title: "Rendering Error",
        message: err.message
      });
    }

    done();
  }
});
