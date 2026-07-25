export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black transition-colors duration-300">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}
