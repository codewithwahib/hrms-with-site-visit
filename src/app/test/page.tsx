'use client';

export default function TestMapPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">MapTiler Test</h1>
      <iframe
        src={`https://api.maptiler.com/maps/streets-v2/?key=BrpijmDZHSFlDrbilCmb`}
        width="100%"
        height="500"
        style={{ border: '1px solid #ccc' }}
      />
    </div>
  );
}