## Admin Panel Fixes Plan

### Phase 1: Quick UI & Data Fixes
1. **Notification dropdown overflow fix** - Fix popup extending outside screen on 1366x768 and lower resolutions
2. **Razorpay payment reference ID** - Save actual Razorpay payment_id in orders table and display it correctly
3. **Customer search by mobile** - Fix mobile search in Customers page
4. **Product edit data binding** - Fix product attributes not loading in edit screen, show existing images

### Phase 2: Parent Product System
5. **Add parent_item_id and parent_item_name to products table** - Migration to add columns
6. **Parent Item autocomplete in Product Modal** - Search by ID/Name with autocomplete
7. **Update product creation/edit flows** for admin and vendor

### Phase 3: Bulk CSV Upload System
8. **Create file_uploads table** - Track upload status, errors
9. **Build File Uploads admin page** - Upload CSV, view status, download error logs
10. **Product CSV upload** with sample format download, background processing, validation
11. **Customer & Vendor CSV upload** with sample formats

### Phase 4: Service Module Enhancements
12. **Service create/edit vendor selection** with State/District filtering
13. **Service detail fields** - long/short description, pricing slots, SEO
14. **Service slot booking conflict prevention**

### Phase 5: Form Validation & Data Integrity
15. **Form field validation** across all admin/vendor/customer forms
16. **Database column type/length audit**
17. **Foreign key constraint fixes**

Shall I proceed with Phase 1 first?
