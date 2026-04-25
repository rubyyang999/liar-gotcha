import Tabs from './Tabs';

export default function Header() {
  return (
    <header className="px-6 py-6 text-center">
      <h1 className="text-2xl font-bold text-[var(--text)]">可疑帳號回報</h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">使用者回報之可疑帳號彙整</p>
      <div className="mt-4 max-w-lg mx-auto">
        <Tabs />
      </div>
    </header>
  );
}
