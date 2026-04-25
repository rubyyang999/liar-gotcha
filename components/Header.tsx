import Tabs from './Tabs';

export default function Header() {
  return (
    <header className="px-6 py-6 text-center">
      <h1 className="text-2xl font-bold text-[var(--text)]">詐騙帳號查詢</h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">幫大家避開可疑帳號</p>
      <div className="mt-4 max-w-lg mx-auto">
        <Tabs />
      </div>
    </header>
  );
}
