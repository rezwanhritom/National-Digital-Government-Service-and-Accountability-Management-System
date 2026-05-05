function PendingApproval() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-amber-300/30 bg-amber-300/10 p-6 text-amber-100">
      <h1 className="text-2xl font-semibold">Role approval pending</h1>
      <p className="mt-3">
        Your privileged role request has been submitted. You can continue commuter features
        after approval by a system administrator.
      </p>
    </div>
  );
}

export default PendingApproval;
