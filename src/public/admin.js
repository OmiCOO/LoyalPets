// Check if user is admin
async function checkAdminAccess() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const response = await fetch('/api/admin/stats', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Error checking admin access:', error);
    window.location.href = '/';
  }
}

// Load overall statistics
async function loadStats() {
  const response = await fetch('/api/admin/stats', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  const stats = await response.json();
  
  document.getElementById('totalUsers').textContent = stats.total_users;
  document.getElementById('totalPets').textContent = stats.total_pets;
  document.getElementById('avgRating').textContent = stats.avg_rating;
}

// Create pet types chart
async function createPetTypesChart() {
  const response = await fetch('/api/admin/pet-types', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  const data = await response.json();
  
  new Chart(document.getElementById('petTypesChart'), {
    type: 'pie',
    data: {
      labels: data.map(d => d.pet_type),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF'
        ]
      }]
    }
  });
}

// Create diseases chart
async function createDiseasesChart() {
  const response = await fetch('/api/admin/diseases', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  const data = await response.json();
  
  new Chart(document.getElementById('diseasesChart'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.disease),
      datasets: [{
        label: 'Number of Cases',
        data: data.map(d => d.count),
        backgroundColor: '#36A2EB'
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create ratings chart
async function createRatingsChart() {
  const response = await fetch('/api/admin/ratings', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  const data = await response.json();
  
  new Chart(document.getElementById('ratingsChart'), {
    type: 'bar',
    data: {
      labels: data.map(d => `${d.rating} Stars`),
      datasets: [{
        label: 'Number of Ratings',
        data: data.map(d => d.count),
        backgroundColor: '#FFCE56'
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create user growth chart
async function createUserGrowthChart() {
  const response = await fetch('/api/admin/user-growth', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  const data = await response.json();
  
  new Chart(document.getElementById('userGrowthChart'), {
    type: 'line',
    data: {
      labels: data.map(d => new Date(d.month).toLocaleDateString('default', { month: 'short', year: 'numeric' })),
      datasets: [{
        label: 'New Users',
        data: data.map(d => d.new_users),
        borderColor: '#4BC0C0',
        fill: false
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create disease by pet type chart
async function createDiseaseByPetTypeChart() {
  const response = await fetch('/api/admin/disease-by-pet-type', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  const data = await response.json();
  
  // Process data for grouped bar chart
  const petTypes = [...new Set(data.map(d => d.pet_type))];
  const diseases = [...new Set(data.map(d => d.disease))];
  
  const datasets = diseases.map(disease => {
    const diseaseData = petTypes.map(petType => {
      const match = data.find(d => d.disease === disease && d.pet_type === petType);
      return match ? match.count : 0;
    });
    
    return {
      label: disease,
      data: diseaseData,
      backgroundColor: getRandomColor()
    };
  });

  new Chart(document.getElementById('diseaseByPetTypeChart'), {
    type: 'bar',
    data: {
      labels: petTypes,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: false,
        },
        y: {
          beginAtZero: true,
          stacked: false,
        }
      },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12
          }
        },
        title: {
          display: true,
          text: 'Disease Distribution by Pet Type'
        }
      }
    }
  });
}

// Helper function for random colors
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Initialize dashboard
async function initDashboard() {
  await checkAdminAccess();
  await loadStats();
  await createPetTypesChart();
  await createDiseasesChart();
  await createRatingsChart();
  await createUserGrowthChart();
  await createDiseaseByPetTypeChart();
}

window.onload = initDashboard; 