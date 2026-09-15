/**
 * ฟังก์ชัน doGet() ใช้สำหรับเรนเดอร์หน้าเว็บ HTML เมื่อมีการเข้าถึง Web App URL
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('ระบบคู่มือเมนูและวัตถุดิบ - ร้านอาหารญี่ปุ่น')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getAllData() {
  try {
    const ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1WJrG1nwZRSwgxo38V4XOov2wxPGA4w-8kRLJhI-TN7E/edit?usp=sharing");
    
    const menuSheet = ss.getSheetByName("menu");
    const menuData = menuSheet && menuSheet.getLastRow() > 1 ? menuSheet.getRange(2, 1, menuSheet.getLastRow() - 1, 5).getValues() : [];
    
    const catSheet = ss.getSheetByName("Category");
    const catData = catSheet && catSheet.getLastRow() > 1 ? catSheet.getRange(2, 1, catSheet.getLastRow() - 1, 1).getValues() : [];
    
    const ingSheet = ss.getSheetByName("Ingredient");
    const ingData = ingSheet && ingSheet.getLastRow() > 1 ? ingSheet.getRange(2, 1, ingSheet.getLastRow() - 1, 5).getValues() : [];
    
    const uniqueIngredients = [...new Set(ingData.map(r => r[2]).filter(Boolean))];
    
    const promoSheet = ss.getSheetByName('Promotions');
    let promotions = [];
    if (promoSheet && promoSheet.getLastRow() > 1) {
      var promoRows = promoSheet.getDataRange().getValues();
      for (var i = 1; i < promoRows.length; i++) {
        if (promoRows[i][1]) { // ใช้คอลัมน์ B (index 1) เป็นรหัสโปรโมชั่น
          promotions.push({
            timeSlot: promoRows[i][0],
            code: promoRows[i][1],
            name: promoRows[i][2],
            items: JSON.parse(promoRows[i][3] || '[]'),
            price: promoRows[i][4],
            desc: promoRows[i][5],
            image: promoRows[i][6]
          });
        }
      }
    }
    
    return {
      success: true,
      menus: menuData.map(r => ({ category: r[0], code: r[1], name: r[2], desc: r[3], image: r[4] })),
      categories: catData.map(r => r[0]).filter(Boolean),
      ingredients: ingData.map(r => ({ code: r[0], menuName: r[1], ingredientName: r[2], quantity: r[3], unit: r[4] })),
      uniqueIngredients: uniqueIngredients,
      promotions: promotions
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ฟังก์ชันบันทึกหรืออัปเดตข้อมูลเมนูอาหาร
 */
function saveMenu(data) {
  try {
    const ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1WJrG1nwZRSwgxo38V4XOov2wxPGA4w-8kRLJhI-TN7E/edit?usp=sharing");
    const sheet = ss.getSheetByName("menu");
    const rows = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] == data.code) {
        rowIndex = i + 1;
        break;
      }
    }
    
    let imageUrl = data.image;
    if (imageUrl && imageUrl.startsWith("data:image")) {
      try {
        const splitData = imageUrl.split(',');
        const contentType = splitData[0].match(/:(.*?);/)[1];
        const base64Data = Utilities.base64Decode(splitData[1]);
        const blob = Utilities.newBlob(base64Data, contentType, "menu_" + data.code + "_" + new Date().getTime() + ".jpg");
        
        const folderId = "1h8wGC9wGprTGhYb8NyCqXB8yGcKU9UO_";
        const folder = DriveApp.getFolderById(folderId);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        imageUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
      } catch (err) {}
    }
    if (rowIndex > -1) {
      sheet.getRange(rowIndex, 1, 1, 5).setValues([[data.category, data.code, data.name, data.desc, imageUrl]]);
    } else {
      sheet.appendRow([data.category, data.code, data.name, data.desc, imageUrl]);
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ฟังก์ชันลบเมนูและวัตถุดิบที่เกี่ยวข้อง
 */
function deleteMenu(code) {
  try {
    const ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1WJrG1nwZRSwgxo38V4XOov2wxPGA4w-8kRLJhI-TN7E/edit?usp=sharing");
    const menuSheet = ss.getSheetByName("menu");
    const menuRows = menuSheet.getDataRange().getValues();
    for (let i = menuRows.length - 1; i >= 1; i--) {
      if (menuRows[i][1] == code) {
        menuSheet.deleteRow(i + 1);
      }
    }
    
    const ingSheet = ss.getSheetByName("Ingredient");
    const ingRows = ingSheet.getDataRange().getValues();
    for (let i = ingRows.length - 1; i >= 1; i--) {
      if (ingRows[i][0] == code) {
        ingSheet.deleteRow(i + 1);
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ฟังก์ชันบันทึกวัตถุดิบรายเมนู
 */
function saveMenuIngredients(code, ingredientsList) {
  try {
    const ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1WJrG1nwZRSwgxo38V4XOov2wxPGA4w-8kRLJhI-TN7E/edit?usp=sharing");
    const sheet = ss.getSheetByName("Ingredient");
    
    let menuName = "";
    const menuSheet = ss.getSheetByName("menu");
    const menuRows = menuSheet.getDataRange().getValues();
    for (let i = 1; i < menuRows.length; i++) {
      if (menuRows[i][1] == code) {
        menuName = menuRows[i][2];
        break;
      }
    }
    
    const rows = sheet.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][0] == code) {
        sheet.deleteRow(i + 1);
      }
    }
    
    ingredientsList.forEach(item => {
      const ingName = item.ingredientName || item.name || "";
      const qty = item.quantity !== undefined ? item.quantity : (item.qty || "");
      const unit = item.unit || "";
      sheet.appendRow([code, menuName, ingName, qty, unit]);
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ฟังก์ชันเพิ่มหมวดหมู่ใหม่
 */
function addCategory(catName) {
  try {
    const ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1WJrG1nwZRSwgxo38V4XOov2wxPGA4w-8kRLJhI-TN7E/edit?usp=sharing");
    let sheet = ss.getSheetByName("Category");
    if (!sheet) {
      sheet = ss.insertSheet("Category");
      sheet.appendRow(["Category Name"]);
    }
    sheet.appendRow([catName]);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ฟังก์ชันแก้ไขชื่อหมวดหมู่
 */
function editCategory(oldName, newName) {
  try {
    const ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1WJrG1nwZRSwgxo38V4XOov2wxPGA4w-8kRLJhI-TN7E/edit?usp=sharing");
    const sheet = ss.getSheetByName("Category");
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == oldName) {
        sheet.getRange(i + 1, 1).setValue(newName);
        break;
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ฟังก์ชันลบหมวดหมู่
 */
function deleteCategory(catName) {
  try {
    const ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1WJrG1nwZRSwgxo38V4XOov2wxPGA4w-8kRLJhI-TN7E/edit?usp=sharing");
    const sheet = ss.getSheetByName("Category");
    const rows = sheet.getDataRange().getValues();
    
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][0] == catName) {
        sheet.deleteRow(i + 1);
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ฟังก์ชันบันทึกโปรโมชั่น
 */
function savePromotion(data) {
  try {
    const ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1WJrG1nwZRSwgxo38V4XOov2wxPGA4w-8kRLJhI-TN7E/edit?usp=sharing");
    let sheet = ss.getSheetByName("Promotions");
    if (!sheet) {
      sheet = ss.insertSheet("Promotions");
      sheet.appendRow(["เวลาโปรโมชั่น", "รหัสโปร", "ชื่อเซตโปร", "เมนูที่อยู่ในเซต", "ราคา", "คำอธิบาย", "รูปโปร"]);
    }
    
    var timeSlot = data.timeSlot || "";
    var code = data.code || "";
    var name = data.name || "";
    var itemsStr = JSON.stringify(data.items || []); 
    var price = data.price || "";
    var desc = data.desc || "";
    var image = data.image || ""; 
    
    if (image && image.startsWith("data:image")) {
      try {
        const splitData = image.split(',');
        const contentType = splitData[0].match(/:(.*?);/)[1];
        const base64Data = Utilities.base64Decode(splitData[1]);
        const blob = Utilities.newBlob(base64Data, contentType, "promo_" + code + "_" + new Date().getTime() + ".jpg");
        
        const folderId = "1h8wGC9wGprTGhYb8NyCqXB8yGcKU9UO_";
        const folder = DriveApp.getFolderById(folderId);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        image = "https://lh3.googleusercontent.com/d/" + file.getId();
      } catch (err) {}
    }
    
    var dataRange = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < dataRange.length; i++) {
      if (dataRange[i][1] == code) { 
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex > -1) {
      sheet.getRange(rowIndex, 1, 1, 7).setValues([[timeSlot, code, name, itemsStr, price, desc, image]]);
    } else {
      sheet.appendRow([timeSlot, code, name, itemsStr, price, desc, image]);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ฟังก์ชันลบโปรโมชั่น
 */
function deletePromotion(code) {
  try {
    var ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1WJrG1nwZRSwgxo38V4XOov2wxPGA4w-8kRLJhI-TN7E/edit?usp=sharing");
    var sheet = ss.getSheetByName('Promotions');
    if (!sheet) return { success: false, message: 'ไม่พบชีตโปรโมชั่น' };
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === code) { // ตรวจสอบคอลัมน์ B (index 1) รหัสโปรโมชั่น
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, message: 'ไม่พบรหัสโปรโมชั่นที่ต้องการลบ' };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

