export async function GET() {
  const res = await fetch('http://143.198.128.209:3456/memory');
  const data = await res.json();
  return Response.json(data);
}