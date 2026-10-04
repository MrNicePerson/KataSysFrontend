import ShopSettings from '../../components/ShopSettings/ShopSettings.jsx'
import DemoDataBackup from '../../components/DemoDataBackup/DemoDataBackup.jsx'
import ProductInputDemo from '../../components/ProductInputDemo/ProductInputDemo.jsx'
import ActivityHistory from '../../components/ActivityHistory/ActivityHistory.jsx'
import UserAdministration from '../../components/UserAdministration/UserAdministration.jsx'
import LanguageSettings from '../../components/LanguageSettings/LanguageSettings.jsx'

export default function Settings({ backupData, onImport, settings, onSaveSettings, onSaveLanguage, language = 'en', canManageLanguage = false, activity = [], products = [], canBackup = false, token, currentUserId }) {
  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
        YOUR WHOLESALE WORKSPACE
      </p>
      <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
        Settings
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-[#718078] mb-6 sm:mb-8">
        Make the workspace feel like your shop.
      </p>

      {canManageLanguage && <div className="mb-6"><LanguageSettings value={language} onSave={onSaveLanguage} /></div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ShopSettings value={settings} onSave={onSaveSettings} />
        {canBackup && <DemoDataBackup backupData={backupData} onImport={onImport} />}
      </div>

      <ProductInputDemo products={products} />
      <ActivityHistory entries={activity} />
      {canBackup && <UserAdministration token={token} currentUserId={currentUserId} />}
    </main>
  )
}
