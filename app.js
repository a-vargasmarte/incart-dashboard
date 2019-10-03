let width = 680,
  height = 600,
  margin = { top: 40, right: 40, bottom: 40, left: 80 };

//-----------------------map----------------------

let svg = d3
  .select("body")
  .append("svg")
  .attr("id", "mapCanvass")
  .attr("width", width)
  .attr("height", height);

d3.select("#mapCanvass")
  .append("text")
  .attr("transform", `translate(20, ${height - margin.bottom})`)
  .attr("class", "provinceStat");

let projection = d3
  .geoMercator()
  // .scale(width / 2 / Math.PI)
  .scale(10000)
  .translate([width * 18.5, height * 6.2]);

let path = d3.geoPath().projection(projection);

// color scales

let color = d3
  .scaleLinear()
  .domain([0, 15, 30, 120, 175, 230])
  .range(d3.schemeReds[6]);

let treemapColors = d3.scaleOrdinal(d3.schemeCategory10);

let opacityScale = d3.scaleLinear().range([0.5, 1]);

// ------------------------------------------------------

// ------------- bar-chart -----------------------------

let barSvg = d3
  .select("body")
  .append("svg")
  .attr("id", "barCanvass")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height * 1.5)
  .attr("transform", `translate(${width / 4}, 0)`)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

let barTitle = d3
  .select("#barCanvass")
  .append("text")
  .attr("transform", `translate(0, ${margin.top / 2})`)
  .text("Casos de cancer por Estadio")
  .attr("font-size", "28");

// ---------------------------------------------------------

// ----------------stacked barplot-------------------------

d3.select("#mapCanvass")
  .append("g")
  .attr("class", "stackYAxis stackAxis")
  .attr("transform", `translate(400, 125)`);
// .call(d3.axisLeft(y));

d3.select("#mapCanvass")
  .append("g")
  .attr("class", "stackXAxis stackAxis")
  .attr("transform", `translate(400, ${200})`);
// .call(d3.axisBottom(x).tickSizeOuter(0));
// ---------- mouse events ------------------
let handleMouseOver = function(d) {
  console.log(d);
  // console.log(d3.select(this));
  let province = d3.selectAll(`.${d.properties.NAME_1.split(" ").join("-")}`);

  province.style("fill", "orange");
};

let handleMouseOut = function(d) {
  console.log(color(d.properties.total));
  let province = d3.selectAll(`.${d.properties.NAME_1.split(" ").join("-")}`);
  province.style("fill", d =>
    d.properties.total === undefined
      ? "black"
      : treemapColors(d.properties.region)
  );
  // console.log(d3.select(this));
  // d3.select(this).style("fill", color(d.properties.total));
};

Promise.all([d3.json("./geodata.json"), d3.json("./drRegion.json")]).then(
  datasets => {
    console.log(datasets);

    let data = datasets[0],
      regionData = datasets[1];

    console.log(regionData);
    console.log(data);
    data.features.map(provincia => {
      regionData.map(region => {
        region.children.map(child => {
          if (provincia.properties.NAME_1 === child.name) {
            console.log(region.name);
            provincia.properties["region"] = region.name;
          }
          // console.log(provincia.properties.NAME_1 ===child.name, region.name);
          // provincia.properties["region"] =
          //   provincia.properties.NAME_1 === child.name ? region.name : null;
        });
      });
    });

    console.log(data);
    updateBarplot(data);

    // -------------- click handlers -----------------
    let provinceClickHandler = function(d) {
      console.log(d);

      if (d3.select(this).attr("value") === null) {
        d3.selectAll(".provincia")
          .attr("value", null)
          .attr("stroke-width", "0.5")
          .attr("stroke", "white");

        d3.selectAll(".provincia")
          .transition()
          .attr("opacity", 0.45);
      }

      d3.select(`.${d.properties.NAME_1.split(" ").join("-")}`)
        .transition()
        .attr("opacity", 1)
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("value", "clicked");

      console.log(regionData);
      // ---------------- APPEND STACKED BARPLOT OF CANCER SEX DIFFERENCES ---
      console.log(d.properties.m, d.properties.f);

      let sexgroup = [
        {
          male: d.properties.m,
          female: d.properties.f,
          name: d.properties.NAME_1
        }
      ];
      console.log(sexgroup);

      let subgroups = ["male", "female"];
      console.log(subgroups);

      //  color palette = one color per subgroup
      let color = d3
        .scaleOrdinal()
        .domain(subgroups)
        .range(["#e41a1c", "#377eb8"]);

      // add y axis
      let y = d3
        .scaleBand()
        .domain([d.properties.NAME_1])
        .range([0, 75])
        .padding([0.2]);

      // add x axis

      let x = d3
        .scaleLinear()
        .domain([0, d.properties.m + d.properties.f])
        .range([0, 200]);

      d3.select(".stackYAxis")
        .transition()
        .call(d3.axisLeft(y));

      d3.select(".stackXAxis")
        .transition()
        .call(d3.axisBottom(x).tickSizeOuter(0));

      let stackedData = d3.stack().keys(subgroups)(sexgroup);
      console.log(stackedData);

      // build the bars
      d3.select("#mapCanvass")
        .append("g")
        .attr("class", "stackGroup")
        .selectAll("g")
        .data(stackedData)
        .enter()
        .append("g")
        .attr("transform", `translate(400,125)`)
        .attr("class", d => d.key)
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("y", d => y(d.data.name))
        .attr("x", d => x(d[0]))
        .attr("height", d => y.bandwidth())
        .transition()
        .duration(500)
        .attr("width", d => x(d[1]) - x(d[0]));

      let regionStats = regionData.filter(
        region => region.name === d.properties.region
      )[0];

      let regionTotal = d3.sum(regionStats.children, d => d.value);

      let provincePercent =
        (d.properties.total / d3.sum(regionStats.children, d => d.value)) * 100;

      let formattedPercent = d3.format(".2s")(provincePercent);

      let provinceStatText = `En ${d.properties.NAME_1} se encontraron ${d.properties.total} de estos casos, correspondientes a ${formattedPercent}% de la ${d.properties.region}`;

      d3.select(".provinceStat")
        .transition()
        .duration(1000)
        .text(provinceStatText);

      // filter data by the name of the selected province
      let filteredData = {};
      filteredData["features"] = data.features.filter(
        province => province.properties.NAME_1 === d.properties.NAME_1
      );
      updateBarplot(filteredData);

      // make the .stackAxis visible
      d3.selectAll(".stackAxis")
        .transition()
        .attr("opacity", 1);
    };

    let svgClickHandler = function(d) {
      svg.selectAll("path").exit();

      d3.selectAll(".provincia")
        .data(root.leaves())
        // .enter()
        .attr("opacity", d => {
          console.log(d.parent.children);
          let colorDomain = [
            d3.min(d.parent.children, x => x.data.value),
            d3.max(d.parent.children, x => x.data.value)
          ];
          console.log(colorDomain);
          opacityScale.domain(colorDomain);
          console.log(opacityScale(d.value));
          return opacityScale(d.value);
        })
        .exit();

      d3.selectAll(".provincia")
        .data(data.features)
        .attr("stroke", "white")
        .attr("stroke-width", 0.5);

      d3.select(".provinceStat")
        .transition()
        .text("");

      d3.selectAll("g.stackGroup")
        .transition()
        .remove();

      d3.selectAll(".stackAxis")
        .transition()
        .attr("opacity", 0);

      updateBarplot(data);
    };
    // --------------------------------------------------

    svg
      .selectAll("path")
      .data(data.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("class", d => {
        console.log(d.properties.total === undefined);
        return d.properties.total === undefined
          ? `provincia ${d.properties.NAME_1.split(" ").join("-")} NA`
          : `provincia ${d.properties.NAME_1.split(" ").join("-")}`;
      })
      .attr("stroke-width", "0.5")
      .attr("stroke", "white")
      .style("fill", d => {
        return d.properties.total === undefined
          ? "black"
          : treemapColors(d.properties.region);
      });

    // ------------------------- bar plot --------------------

    // append g elements for each axis of the bar plot
    barSvg
      .append("g")
      .attr("class", "xAxis")
      .attr("transform", `translate(0, ${height})`);

    barSvg.append("g").attr("class", "yAxis");

    // create a tooltip
    let Tooltip = d3
      .select("#barCanvass")
      .append("g")
      .attr("class", "tooltip-group");

    Tooltip.append("text")
      .attr("font-size", "80")
      .style("opacity", 0);

    Tooltip.append("text")
      .attr("id", "tooltipStats")
      .style("font-color", "white")
      .style("opacity", 0);

    // Three function that change the tooltip when user hover / move / leave a cell
    var barMouseover = function(d) {
      console.log(d);
      // console.log(d3.mouse(this)[0]);

      // console.log(d3.select("[value=clicked]").data());

      let selectedProvince = d3.select("[value=clicked]").data()[0].properties
        .NAME_1;
      // console.log(selectedProvince);

      // Tooltip.select("rect").style("opacity", 0.3);
      Tooltip.select("text")
        .style("opacity", 0.3)
        .text(d.value);

      d3.select("#tooltipStats")
        .style("opacity", 1)
        .style("font-size", 20)
        .text(`casos en ${selectedProvince} se encontraron en ${d.stage}`);

      d3.select(this)
        .style("stroke", "black")
        .style("opacity", 1);
    };
    var barMousemove = function(d) {
      // Tooltip.select("rect").attr(
      //   "transform",
      //   `translate(${d3.mouse(this)[0] + 275}, ${height - d3.mouse(this)[1]})`
      // );

      Tooltip.select("text").attr("transform", d => {
        return d3.mouse(this)[1] <= 240
          ? `translate(${d3.mouse(this)[0] + 200}, ${d3.mouse(this)[1] + 75})`
          : `translate(${d3.mouse(this)[0] + 200}, ${d3.mouse(this)[1] - 75})`;
      });

      d3.select("#tooltipStats").attr("transform", d => {
        return d3.mouse(this)[1] <= 240
          ? `translate(${d3.mouse(this)[0] + 300}, ${d3.mouse(this)[1] + 75})`
          : `translate(${d3.mouse(this)[0] + 300}, ${d3.mouse(this)[1] - 75})`;
      });
    };
    var barMouseleave = function(d) {
      // Tooltip.select("rect").style("opacity", 0);
      Tooltip.select("text")
        .style("opacity", 0)
        .text("");
      d3.select("#tooltipStats")
        .style("opacity", 0)
        .text("");

      d3.select(this)
        .style("stroke", "none")
        .style("opacity", 0.8);
    };

    // create an updateBar function to run the rendering of our bar plot

    function updateBarplot(data) {
      console.log(data);

      let { properties } = data.features[0];
      let cancerStages = [
        { stage: "Stage I", value: properties.I },
        { stage: "Stage II", value: properties.II },
        { stage: "Stage III", value: properties.III },
        { stage: "Stage IV", value: properties.IV },
        { stage: "Unknown", value: properties.unknown }
      ];

      let stages = cancerStages.map(d => d.stage);
      // console.log(cancerStages);
      let yScale = d3
        .scaleBand()
        .domain(stages)
        .range([0, height])
        .padding(0.1);

      // y axis

      let yAxis = d3.axisLeft(yScale);

      barSvg.select(".yAxis").call(yAxis);

      // x scale

      let xScale = d3
        .scaleLinear()
        .domain([
          d3.min(cancerStages, d => d.value),
          d3.max(cancerStages, d => d.value)
        ])
        .range([0, width]);

      // x axis
      let xAxis = d3.axisBottom(xScale);

      barSvg
        .select(".xAxis")
        .transition(1500)
        .call(xAxis);

      // --------------------- bar rendering -----------------

      // join the data
      const bars = barSvg.selectAll(".bar").data(cancerStages);
      console.log(barSvg);

      // EXIT
      bars
        .exit()
        .attr("fill", "red")
        .transition()
        .duration(500)
        .attr("width", 0)
        .attr("y", d => yScale(d.stage))
        .remove();

      // UPDATE

      bars
        .on("mouseover", barMouseover)
        .on("mousemove", barMousemove)
        .on("mouseleave", barMouseleave)
        .transition()
        .duration(500)
        .attr("height", yScale.bandwidth())
        .attr("y", d => yScale(d.stage))
        .attr("width", d => {
          // console.log(xScale(d.value));
          return xScale(d.value);
        });

      // ENTER

      bars
        .enter()
        .append("rect")
        .attr("class", (d, i) => `bar bar-${i}`);

      bars
        .attr("height", yScale.bandwidth())
        .attr("y", d => yScale(d.stage))
        .transition()
        .duration(500)
        .attr("width", d => {
          // console.log(xScale(d.value));
          return xScale(d.value);
        })
        .style("fill", d => {
          // console.log(d);
          return color(d.value);
        });
    }

    // run function for the first time
    updateBarplot(data);

    //-------------------------------------------------------
    regionData.map(region => {
      // console.log(region);
      region.children.map(child => {
        data.features.map(province => {
          // console.log(province.properties.NAME_1 === child.name);
          province.properties.NAME_1 === child.name
            ? (child["value"] = province.properties.total)
            : null;
        });
      });
    });

    let { features } = data;

    // define hierarchical data structure

    let hierarchy = {
      name: "Dominican Republic",
      value: d3.max(features, d => d.properties.total),
      children: regionData
    };

    let root = d3.hierarchy(hierarchy).sum(d => {
      // console.log(d.value);
      return d.value;
    });

    // --------------------------------- fix opacity of map

    svg.selectAll("path").exit();

    svg
      .selectAll("path")
      .data(root.leaves())
      // .enter()
      .attr("opacity", d => {
        let colorDomain = [
          d3.min(d.parent.children, x => x.data.value),
          d3.max(d.parent.children, x => x.data.value)
        ];
        opacityScale.domain(colorDomain);
        return opacityScale(d.value);
      })
      .exit();

    let totalCancer = d3.sum(data.features, d => d.properties.total);

    svg
      .append("text")
      // .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .text(
        `En la Republica Dominicana, se registraron ${totalCancer} casos de cancer en el periodo 2017-2018`
      )
      .attr("transform", `translate(0,${margin.top})`);

    svg
      .selectAll("path")
      .data(data.features)
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", provinceClickHandler);

    svg.selectAll(".NA").on("click", null);

    // ------------- reset handler for map

    d3.select("#mapCanvass")
      .attr("transform", `translate(20,-280)`)
      .append("g")
      .attr("transform", `translate(50,50)`)
      .attr("class", "resetGroup")
      .on("click", svgClickHandler)
      .append("rect")
      .attr("height", "50")
      .attr("width", "100")
      .attr("transform", `translate(50,50)`)
      .attr("opacity", 0.6);

    d3.select(".resetGroup")
      .append("text")
      .attr("transform", `translate(70,75)`)
      .style("fill", "white")
      .text("reset map");
  }
);
