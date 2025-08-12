document.addEventListener('DOMContentLoaded', () => {
    const checkinForm = document.getElementById('checkin-form');
    const currentVisitorsList = document.getElementById('current-visitors-list');
    const historyTableBody = document.getElementById('history-table-body');

    // Fungsi untuk memformat tanggal agar mudah dibaca
    const formatDateTime = (isoString) => {
        if (!isoString) return 'Masih di dalam';
        const date = new Date(isoString);
        return date.toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    // Fungsi untuk mengambil dan menampilkan pengunjung saat ini
    const fetchCurrentVisitors = async () => {
        try {
            const response = await fetch('/api/visitors/current');
            const visitors = await response.json();

            currentVisitorsList.innerHTML = ''; // Kosongkan list

            if (visitors.length === 0) {
                currentVisitorsList.innerHTML = '<li>Tidak ada pengunjung saat ini.</li>';
                return;
            }

            visitors.forEach(visitor => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="visitor-info">
                        <strong>${visitor.name}</strong>
                        <span>Tujuan: ${visitor.purpose}</span>
                    </div>
                    <button class="btn btn-secondary checkout-btn" data-id="${visitor.id}">Check-out</button>
                `;
                currentVisitorsList.appendChild(li);
            });
        } catch (error) {
            console.error('Gagal mengambil data pengunjung saat ini:', error);
            currentVisitorsList.innerHTML = '<li>Gagal memuat data.</li>';
        }
    };

    // Fungsi untuk mengambil dan menampilkan riwayat kunjungan
    const fetchHistory = async () => {
        try {
            const response = await fetch('/api/visitors/history');
            const visitors = await response.json();

            historyTableBody.innerHTML = ''; // Kosongkan tabel

            if (visitors.length === 0) {
                historyTableBody.innerHTML = '<tr><td colspan="4">Belum ada riwayat kunjungan.</td></tr>';
                return;
            }

            visitors.forEach(visitor => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${visitor.name}</td>
                    <td>${visitor.purpose}</td>
                    <td>${formatDateTime(visitor.check_in_time)}</td>
                    <td>${formatDateTime(visitor.check_out_time)}</td>
                `;
                historyTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('Gagal mengambil riwayat kunjungan:', error);
            historyTableBody.innerHTML = '<tr><td colspan="4">Gagal memuat data.</td></tr>';
        }
    };

    // Event listener untuk form check-in
    checkinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const purpose = document.getElementById('purpose').value;

        try {
            const response = await fetch('/api/visitors/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, purpose }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Gagal melakukan check-in');
            }

            checkinForm.reset(); // Reset form
            fetchAllData(); // Muat ulang semua data
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Event listener untuk tombol check-out (menggunakan event delegation)
    currentVisitorsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('checkout-btn')) {
            const visitorId = e.target.dataset.id;
            if (confirm('Apakah Anda yakin ingin check-out pengunjung ini?')) {
                try {
                    const response = await fetch(`/api/visitors/checkout/${visitorId}`, {
                        method: 'PUT',
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Gagal melakukan check-out');
                    }
                    
                    fetchAllData(); // Muat ulang semua data
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }
    });

    // Fungsi untuk memuat semua data
    const fetchAllData = () => {
        fetchCurrentVisitors();
        fetchHistory();
    };

    // Panggil fungsi untuk pertama kali saat halaman dimuat
    fetchAllData();
});
