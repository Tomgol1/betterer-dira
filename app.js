/* betterer-dira — Live Lottery Probability Calculator */

const API_URL = 'https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FProjectStatus%3D4%26PageNumber%3D1%26PageSize%3D50%26IsInit%3Dtrue';

// State management
const state = {
  records: [],
  perLottery: [],
  perCity: [],
  selectedCities: new Set()
};

// API field mapping
function transformDiraData(apiData) {
  if (!apiData.ProjectItems || !Array.isArray(apiData.ProjectItems)) {
    throw new Error('Invalid API response structure');
  }

  return apiData.ProjectItems
    .filter(item => item.TotalSubscribers > 0) // Only include projects with applicants
    .map(item => ({
      Name: `${item.ProjectName || 'Project'} (${item.LotteryNumber})`,
      City: item.CityDescription || 'Unknown City',
      Total_Houses: item.TargetHousingUnits || item.HousingUnits || 0,
      Applicants: item.TotalSubscribers || 0,
      Wheelchair_Houses: item.HousingUnitsForHandicapped || 0,
      Wheelchair_Applicants: item.TotalHandicappedSubscribers || 0,
      Combat_Houses: item.HU_CombatReservist_L || 0,
      Combat_Applicants: item.TotalCombatReservistSubscribers || 0,
      Reserve_Houses: item.HU_Reservists_L || 0,
      Reserve_Applicants: item.TotalReservedDutySubscribers || 0,
      Local_Houses: item.LocalHousing || item.LocalNumber || 0,
      Local_Applicants: item.TotalLocalSubscribers || 0,
      // Additional metadata
      LotteryNumber: item.LotteryNumber,
      ApplicationEndDate: item.ApplicationEndDate,
      ProcessName: item.ProcessName,
      ContractorDescription: item.ContractorDescription
    }));
}

// Lottery calculation logic
function computeLottery(rec) {
  const TH = rec.Total_Houses, A = rec.Applicants;
  const D_h = rec.Wheelchair_Houses, D_a = rec.Wheelchair_Applicants;
  const C_h = rec.Combat_Houses, C_a = rec.Combat_Applicants;
  const R_h = rec.Reserve_Houses, R_a = rec.Reserve_Applicants;
  const L_h = rec.Local_Houses, L_a = rec.Local_Applicants;

  const designated = D_h + C_h + R_h + L_h;
  const regularHouses = Math.max(0, TH - designated);

  const used_dis = Math.min(D_h, D_a), unclaimed_dis = D_h - used_dis;
  const used_com = Math.min(C_h, C_a), unclaimed_com = C_h - used_com;
  const used_loc = Math.min(L_h, L_a), unclaimed_loc = L_h - used_loc;

  const reserve_available = R_h + unclaimed_com;
  const used_res = Math.min(reserve_available, R_a);
  const unclaimed_res = reserve_available - used_res;

  const generalPoolHouses = unclaimed_dis + unclaimed_res + unclaimed_loc + regularHouses;
  const regularApplicants = Math.max(0, A - (D_a + C_a + R_a + L_a));

  const overflow_dis = Math.max(0, D_a - D_h);
  const overflow_com = Math.max(0, C_a - C_h);
  const overflow_res = Math.max(0, R_a - reserve_available);
  const overflow_loc = Math.max(0, L_a - L_h);

  const totalCompetitors = regularApplicants + overflow_dis + overflow_com + overflow_res + overflow_loc;
  const pLottery = totalCompetitors > 0 ? Math.min(1, generalPoolHouses / totalCompetitors) : 0;

  return { regularHouses, generalPoolHouses, totalCompetitors, pLottery };
}

function combineIndependent(probabilities) {
  return 1 - probabilities.reduce((acc, p) => acc * (1 - p), 1);
}

function formatPct(x) {
  return Number.isFinite(x) ? (x * 100).toFixed(2) + "%" : "—";
}

// UI rendering functions with sorting
function renderTable(id, rows, sortable = false) {
  const el = document.getElementById(id);
  if (!rows.length) {
    el.innerHTML = "<p class='muted'>No data available.</p>";
    return;
  }

  const columnHeaders = Object.keys(rows[0]);
  const thead = "<thead><tr>" + columnHeaders.map(h => {
    const sortClass = sortable ? 'sortable' : '';
    const sortIcon = sortable ? ' <span class="sort-icon">⇅</span>' : '';
    return `<th class="${sortClass}" data-column="${h}">${h}${sortIcon}</th>`;
  }).join("") + "</tr></thead>";
  
  const tbody = "<tbody>" + rows.map(r => 
    "<tr>" + columnHeaders.map(h => `<td>${r[h]}</td>`).join("") + "</tr>"
  ).join("") + "</tbody>";
  
  el.innerHTML = `<div class="tablewrap"><table id="${id}_table">${thead}${tbody}</table></div>`;
  
  // Add sorting functionality if enabled
  if (sortable) {
    addTableSorting(`${id}_table`, rows);
  }
}

function renderSortableTable(id, rows, title = '') {
  const el = document.getElementById(id);
  if (!rows.length) {
    el.innerHTML = title ? `<h3>${title}</h3><p class='muted'>No data available.</p>` : "<p class='muted'>No data available.</p>";
    return;
  }

  const columnHeaders = Object.keys(rows[0]);
  const thead = "<thead><tr>" + columnHeaders.map(h => {
    const sortIcon = '<span class="sort-icon">⇅</span>';
    return `<th class="sortable" data-column="${h}">${h} ${sortIcon}</th>`;
  }).join("") + "</tr></thead>";
  
  const tbody = "<tbody>" + rows.map(r => 
    "<tr>" + columnHeaders.map(h => `<td>${r[h]}</td>`).join("") + "</tr>"
  ).join("") + "</tbody>";
  
  const tableHtml = `<div class="tablewrap"><table id="${id}_table">${thead}${tbody}</table></div>`;
  
  if (title) {
    el.innerHTML = `<h3>${title}</h3>${tableHtml}`;
  } else {
    el.innerHTML = tableHtml;
  }
  
  addTableSorting(`${id}_table`, rows);
}

function addTableSorting(tableId, originalData) {
  const table = document.getElementById(tableId);
  const headerElements = table.querySelectorAll('th.sortable');
  let currentSort = { column: null, direction: 'asc' };
  
  headerElements.forEach(header => {
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      const column = header.dataset.column;
      
      // Toggle direction if same column, otherwise default to asc
      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.direction = 'asc';
      }
      currentSort.column = column;
      
      // Update sort icons
      headerElements.forEach(h => {
        const icon = h.querySelector('.sort-icon');
        if (h.dataset.column === column) {
          icon.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
          h.style.color = 'var(--acc)';
        } else {
          icon.textContent = '⇅';
          h.style.color = 'var(--text)';
        }
      });
      
      // Sort data
      const sortedData = [...originalData].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle percentage values
        if (typeof aVal === 'string' && aVal.includes('%')) {
          aVal = parseFloat(aVal.replace('%', ''));
          bVal = parseFloat(bVal.replace('%', ''));
        }
        // Handle numbers
        else if (!isNaN(aVal) && !isNaN(bVal)) {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        // Handle strings
        else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }
        
        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
      
      // Re-render table body
      const tbody = table.querySelector('tbody');
      const columnKeys = Object.keys(sortedData[0]);
      tbody.innerHTML = sortedData.map(r => 
        "<tr>" + columnKeys.map(h => `<td>${r[h]}</td>`).join("") + "</tr>"
      ).join("");
    });
  });
}

function renderCitySelector(cities) {
  const el = document.getElementById("citySelector");
  if (!cities.length) {
    el.innerHTML = "<p class='muted'>Load data first.</p>";
    return;
  }

  const items = cities.map(city => {
    const checked = state.selectedCities.has(city) ? "checked" : "";
    return `<label class="chip">
      <input type="checkbox" value="${city}" ${checked} /> ${city}
    </label>`;
  }).join("");

  el.innerHTML = `
    <div class="chips">${items}</div>
    <p class="muted">Select up to 3 cities. Selecting a city means you participate in all its lotteries.</p>
  `;

  // Add event listeners
  el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const city = e.target.value;
      if (e.target.checked) {
        if (state.selectedCities.size >= 3) {
          e.target.checked = false;
          alert("You can select at most 3 cities.");
          return;
        }
        state.selectedCities.add(city);
      } else {
        state.selectedCities.delete(city);
      }
      computeAndRender();
    });
  });
}

function updateDataStats(records) {
  const cities = [...new Set(records.map(r => r.City))];
  const totalApplicants = records.reduce((sum, r) => sum + r.Applicants, 0);
  const totalUnits = records.reduce((sum, r) => sum + r.Total_Houses, 0);

  document.getElementById('totalProjects').textContent = records.length;
  document.getElementById('totalCities').textContent = cities.length;
  document.getElementById('totalApplicants').textContent = totalApplicants.toLocaleString();
  document.getElementById('totalUnits').textContent = totalUnits.toLocaleString();
  document.getElementById('dataStats').classList.remove('hidden');
}

function computeAndRender() {
  // Calculate per-lottery results
  state.perLottery = state.records.map(rec => {
    const calc = computeLottery(rec);
    return {
      Name: rec.Name,
      City: rec.City,
      Total_Houses: rec.Total_Houses,
      Applicants: rec.Applicants,
      GeneralPool_Houses: calc.generalPoolHouses,
      Competitors: calc.totalCompetitors,
      P_Win_Lottery: formatPct(calc.pLottery)
    };
  });

  // Render sortable lottery results table
  renderSortableTable("results", state.perLottery);

  // Calculate per-city probabilities
  const byCity = {};
  state.records.forEach(rec => {
    if (!byCity[rec.City]) byCity[rec.City] = [];
    byCity[rec.City].push(computeLottery(rec).pLottery);
  });

  state.perCity = Object.entries(byCity).map(([city, probabilities]) => ({
    City: city,
    Lotteries: probabilities.length,
    P_Win_At_Least_One: formatPct(combineIndependent(probabilities))
  }));

  // Calculate overall probability
  const selected = [...state.selectedCities];
  const selectedCityProbs = selected.map(city => combineIndependent(byCity[city] || []));
  const overall = selected.length ? combineIndependent(selectedCityProbs) : 0;

  // Render combined results with sorting
  const combined = [
    {
      Scope: "Overall (selected cities)",
      Detail: selected.join(" | ") || "—",
      Probability: formatPct(overall)
    },
    ...state.perCity.map(r => ({
      Scope: "City",
      Detail: r.City,
      Probability: r.P_Win_At_Least_One
    }))
  ];

  // Add the city & overall table with sorting
  const resultsEl = document.getElementById("results");
  const currentContent = resultsEl.innerHTML;
  
  const tableHeaders = Object.keys(combined[0]);
  const thead = "<thead><tr>" + tableHeaders.map(h => {
    const sortIcon = '<span class="sort-icon">⇅</span>';
    return `<th class="sortable" data-column="${h}">${h} ${sortIcon}</th>`;
  }).join("") + "</tr></thead>";
  
  const tbody = "<tbody>" + combined.map(r => 
    "<tr>" + tableHeaders.map(h => `<td>${r[h]}</td>`).join("") + "</tr>"
  ).join("") + "</tbody>";
  
  const cityTableHtml = `<h3>City & Overall Probabilities</h3><div class="tablewrap"><table id="cityResults_table">${thead}${tbody}</table></div>`;
  
  resultsEl.innerHTML = currentContent + cityTableHtml;
  
  addTableSorting("cityResults_table", combined);

  document.getElementById("exportResults").disabled = state.perLottery.length === 0;
}

// Manual JSON loading functions
function showManualInstructions() {
  const instructions = document.getElementById('manualInstructions');
  instructions.classList.toggle('hidden');
  
  const button = document.getElementById('showManualInstructions');
  if (instructions.classList.contains('hidden')) {
    button.textContent = '📊 Load Live Data';
  } else {
    button.textContent = '❌ Hide Instructions';
  }
}

function loadFromJsonInput() {
  const textarea = document.getElementById('jsonInput');
  const status = document.getElementById('parseStatus');
  const jsonText = textarea.value.trim();
  
  if (!jsonText) {
    status.textContent = 'Please paste JSON data first';
    status.style.color = '#fecaca';
    return;
  }
  
  try {
    status.textContent = 'Parsing...';
    status.style.color = 'var(--acc)';
    
    const data = JSON.parse(jsonText);
    const transformedData = transformDiraData(data);
    
    if (transformedData.length === 0) {
      throw new Error('No active lotteries found in the data');
    }
    
    // Update state and UI
    state.records = transformedData;
    state.selectedCities.clear();
    
    updateDataStats(transformedData);
    
    const preview = transformedData.map(r => ({
      Name: r.Name,
      City: r.City,
      Total_Houses: r.Total_Houses,
      Applicants: r.Applicants,
      Wheelchair_Houses: r.Wheelchair_Houses,
      Combat_Houses: r.Combat_Houses,
      Reserve_Houses: r.Reserve_Houses,
      Local_Houses: r.Local_Houses
    }));
    
    renderTable("dataTable", preview);
    
    const cities = [...new Set(transformedData.map(r => r.City))].sort();
    renderCitySelector(cities);
    
    document.getElementById("results").innerHTML = "";
    computeAndRender();
    
    // Success feedback
    document.getElementById('loadMsg').textContent = `✅ Successfully loaded ${transformedData.length} active lotteries from ${cities.length} cities`;
    document.getElementById('loadMsg').className = 'success';
    document.getElementById('loadError').textContent = '';
    
    status.textContent = `✅ Loaded ${transformedData.length} lotteries`;
    status.style.color = '#86efac';
    
    // Hide instructions after successful load
    document.getElementById('manualInstructions').classList.add('hidden');
    document.getElementById('showManualInstructions').textContent = '📊 Load Live Data';
    
    // Clear the textarea
    textarea.value = '';
    
  } catch (error) {
    console.error('JSON parse error:', error);
    status.textContent = `❌ Error: ${error.message}`;
    status.style.color = '#fecaca';
    
    document.getElementById('loadError').textContent = `Failed to parse data: ${error.message}`;
  }
}

function loadSampleData() {
  const sampleData = [
    {
      Name: "Example A (2654)",
      City: "Tel Aviv",
      Total_Houses: 250,
      Applicants: 2508,
      Wheelchair_Houses: 8,
      Wheelchair_Applicants: 1,
      Combat_Houses: 37,
      Combat_Applicants: 0,
      Reserve_Houses: 50,
      Reserve_Applicants: 0,
      Local_Houses: 50,
      Local_Applicants: 265
    },
    {
      Name: "Example B (2655)",
      City: "Tel Aviv", 
      Total_Houses: 120,
      Applicants: 1300,
      Wheelchair_Houses: 5,
      Wheelchair_Applicants: 7,
      Combat_Houses: 10,
      Combat_Applicants: 12,
      Reserve_Houses: 12,
      Reserve_Applicants: 40,
      Local_Houses: 0,
      Local_Applicants: 0
    },
    {
      Name: "Example C (2656)",
      City: "Haifa",
      Total_Houses: 90,
      Applicants: 600,
      Wheelchair_Houses: 0,
      Wheelchair_Applicants: 0,
      Combat_Houses: 5,
      Combat_Applicants: 2,
      Reserve_Houses: 8,
      Reserve_Applicants: 3,
      Local_Houses: 10,
      Local_Applicants: 70
    },
    {
      Name: "Example D (2657)",
      City: "Jerusalem",
      Total_Houses: 300,
      Applicants: 3000,
      Wheelchair_Houses: 3,
      Wheelchair_Applicants: 6,
      Combat_Houses: 15,
      Combat_Applicants: 20,
      Reserve_Houses: 20,
      Reserve_Applicants: 10,
      Local_Houses: 40,
      Local_Applicants: 50
    }
  ];

  state.records = sampleData;
  state.selectedCities.clear();

  updateDataStats(sampleData);
  
  const preview = sampleData.map(r => ({
    Name: r.Name,
    City: r.City,
    Total_Houses: r.Total_Houses,
    Applicants: r.Applicants,
    Wheelchair_Houses: r.Wheelchair_Houses,
    Combat_Houses: r.Combat_Houses,
    Reserve_Houses: r.Reserve_Houses,
    Local_Houses: r.Local_Houses
  }));

  renderTable("dataTable", preview);

  const cities = [...new Set(sampleData.map(r => r.City))].sort();
  renderCitySelector(cities);

  document.getElementById("results").innerHTML = "";
  computeAndRender();

  document.getElementById('loadMsg').textContent = '✓ Loaded sample data';
  document.getElementById('loadMsg').className = 'success';
}

// CSV export
function exportToCSV() {
  if (!state.perLottery.length) return;

  const headers = ['Name', 'City', 'P_Win_Lottery'];
  const rows = state.perLottery.map(r => [r.Name, r.City, r.P_Win_Lottery]);
  
  // Add overall probability
  const selected = [...state.selectedCities];
  const overallRow = ['(Overall)', selected.join(' | ') || '—', 'Calculate from results table'];
  rows.push(overallRow);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.getElementById('downloadLink');
  link.href = url;
  link.download = 'lottery_results.csv';
  link.classList.remove('hidden');
  link.textContent = 'Download Results CSV';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('showManualInstructions').addEventListener('click', showManualInstructions);
  document.getElementById('loadFromJson').addEventListener('click', loadFromJsonInput);
  document.getElementById('loadSample').addEventListener('click', loadSampleData);
  document.getElementById('exportResults').addEventListener('click', exportToCSV);

  // Auto-load sample data on page load
  loadSampleData();
});
