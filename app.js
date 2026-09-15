// URL ของ Google Apps Script (เปลี่ยนเรียบร้อยแล้ว)
const GAS_URL = "https://script.google.com/macros/s/AKfycbz6X1vpitDlidQVpRemf_EAflNP7O4KgGLfdYJldlhOiinWmej_c0c0e_uIE-AZSpDWaQ/exec";

// ==========================================
// ส่วนของการดึงข้อมูล (GET) สำหรับหน้าพนักงาน
// ==========================================
async function fetchMenus() {
    try {
        // เพิ่ม ?action=getMenus เพื่อบอก GAS ว่าต้องการข้อมูลอะไร
        const response = await fetch(`${GAS_URL}?action=getMenus`);
        const data = await response.json();
        
        const container = document.getElementById('menu-container');
        if(container) {
            container.innerHTML = '';
            // สมมติว่า GAS ส่ง { status: "success", data: [...] } กลับมา
            if(data.data && data.data.length > 0) {
                data.data.forEach(item => {
                    container.innerHTML += `
                        <div class="card">
                            <h3>${item.name}</h3>
                            <p>หมวดหมู่: ${item.category}</p>
                        </div>
                    `;
                });
            } else {
                container.innerHTML = '<p>ยังไม่มีข้อมูลเมนู</p>';
            }
        }
    } catch (error) {
        console.error("Error fetching menus:", error);
        const container = document.getElementById('menu-container');
        if(container) container.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล (ตรวจสอบ GAS)</p>';
    }
}

function loadPromotions(timePeriod) {
    alert(`กำลังดึงข้อมูลโปรโมชั่นช่วงเวลา: ${timePeriod} จากฐานข้อมูล...`);
    // ในอนาคตสามารถใช้ fetch เพื่อดึงข้อมูลตามช่วงเวลาได้เลย
}

// โหลดข้อมูลทันทีเมื่อเปิดหน้า index.html
if(document.getElementById('menu-container')) {
    fetchMenus();
}

// ==========================================
// ส่วนของระบบจัดการผู้ดูแล (Admin)
// ==========================================
function checkLogin() {
    const pass = document.getElementById('admin-password').value;
    if (pass === 'admin123') {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

// ฟังก์ชันสำหรับส่งข้อมูลใหม่ไปบันทึกที่ GAS (POST)
async function submitNewMenu(event) {
    event.preventDefault(); // ป้องกันการรีเฟรชหน้า
    const name = document.getElementById('menu-name').value;
    const category = document.getElementById('menu-category').value;
    const statusMsg = document.getElementById('status-msg');

    statusMsg.innerText = "กำลังบันทึกข้อมูล...";
    statusMsg.style.color = "blue";

    const payload = {
        action: "addMenu",
        data: { name: name, category: category }
    };

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            // สำคัญมาก! สำหรับ GAS เพื่อเลี่ยงปัญหา CORS
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            redirect: "follow"
        });
        
        const result = await response.json();
        if (result.status === "success") {
            statusMsg.innerText = "บันทึกข้อมูลสำเร็จ!";
            statusMsg.style.color = "green";
            document.getElementById('add-menu-form').reset();
        } else {
            statusMsg.innerText = "บันทึกไม่สำเร็จ โปรดลองใหม่";
            statusMsg.style.color = "red";
        }
    } catch (error) {
        console.error("Error:", error);
        statusMsg.innerText = "เกิดข้อผิดพลาดในการเชื่อมต่อ";
        statusMsg.style.color = "red";
    }
}