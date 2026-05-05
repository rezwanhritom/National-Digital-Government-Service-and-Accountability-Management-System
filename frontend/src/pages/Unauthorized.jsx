function Unauthorized() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-rose-300/30 bg-rose-300/10 p-6 text-rose-100">
      <h1 className="text-2xl font-semibold">Unauthorized</h1>
      <p className="mt-3">Your account does not have permission to access this section.</p>
    </div>
  );
}

export default Unauthorized;
