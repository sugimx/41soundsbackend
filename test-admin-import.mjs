import('./src/modules/admin/routes/adminRoutes.js')
  .then(m => {
    console.log('✅ Admin routes imported successfully');
    console.log('Export:', Object.keys(m));
  })
  .catch(err => {
    console.error('❌ Error importing admin routes:');
    console.error(err);
  });
