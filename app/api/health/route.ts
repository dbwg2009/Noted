export async function GET() {
  return Response.json({ status: "ok", version: process.env.npm_package_version ?? "unknown" });
}
