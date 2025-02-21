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
  const [statsResponse, metricsResponse] = await Promise.all([
    fetch('/api/admin/stats', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    }),
    fetch('/api/admin/engagement-metrics', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
  ]);

  const stats = await statsResponse.json();
  const metrics = await metricsResponse.json();
  
  document.getElementById('totalUsers').textContent = stats.total_users;
  document.getElementById('totalPets').textContent = stats.total_pets;
  document.getElementById('avgRating').textContent = stats.avg_rating;
  document.getElementById('monthlyActiveUsers').textContent = metrics.monthly_active_users || '0';
  document.getElementById('avgSessionDuration').textContent = 
    `${metrics.avg_session_duration_minutes || '0'} mins`;
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

// Load engagement metrics
async function loadEngagementMetrics() {
  const response = await fetch('/api/admin/engagement-metrics', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  const data = await response.json();
  
  // Update stats cards
  document.getElementById('monthlyActiveUsers').textContent = data.engagement.monthly_active_users;
  document.getElementById('avgSessionDuration').textContent = 
    `${data.engagement.avg_session_duration_minutes} mins`;

  // Create conversations chart
  new Chart(document.getElementById('conversationsChart'), {
    type: 'bar',
    data: {
      labels: ['Daily', 'Weekly', 'Monthly'],
      datasets: [{
        label: 'Conversations',
        data: [
          data.engagement.daily_conversations,
          data.engagement.weekly_conversations,
          data.engagement.monthly_conversations
        ],
        backgroundColor: '#4BC0C0'
      }]
    }
  });

  // Create topics chart
  new Chart(document.getElementById('topicsChart'), {
    type: 'doughnut',
    data: {
      labels: data.topics.map(t => t.topic),
      datasets: [{
        data: data.topics.map(t => t.count),
        backgroundColor: generateColorArray(data.topics.length)
      }]
    }
  });

  // Create device distribution chart
  new Chart(document.getElementById('deviceChart'), {
    type: 'pie',
    data: {
      labels: data.devices.map(d => d.device_type),
      datasets: [{
        data: data.devices.map(d => d.count),
        backgroundColor: generateColorArray(data.devices.length)
      }]
    }
  });

  // Create response metrics chart
  new Chart(document.getElementById('responseMetricsChart'), {
    type: 'bar',
    data: {
      labels: ['Avg Response Time (s)', 'Understanding Rate (%)'],
      datasets: [{
        data: [
          data.response.avg_response_time,
          ((data.response.total_queries - data.response.misunderstood_queries) / 
           data.response.total_queries * 100).toFixed(2)
        ],
        backgroundColor: ['#FF6384', '#36A2EB']
      }]
    }
  });
}

// Helper function for generating colors
function generateColorArray(length) {
  return Array.from({ length }, () => getRandomColor());
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
  await loadEngagementMetrics();
}

window.onload = initDashboard; 