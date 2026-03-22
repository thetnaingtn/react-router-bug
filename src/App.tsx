import {
  createBrowserRouter,
  redirect,
  Outlet,
  Link,
  useFetcher,
  type MiddlewareFunction,
  type LoaderFunction,
} from "react-router";
import { RouterProvider } from "react-router/dom";
import { useCallback, useEffect, useState } from "react";

// ─── Simulated auth state ────────────────────────────────────────────
let sessionExpired = false;

// ─── Middleware (same pattern as auth.ts) ─────────────────────────────
const authentication: MiddlewareFunction = async (_args, next) => {
  // Simulate async auth check like: fetch("/v1/api/users/me")
  await new Promise((r) => setTimeout(r, 100));

  if (sessionExpired) {
    throw redirect("/");
  }

  return next();
};

// ─── Loader (same pattern as keyword.ts) ──────────────────────────────
const dataLoader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";

  // Simulate async API call like: api.get("/scrape-results", { params })
  await new Promise((r) => setTimeout(r, 200));

  return {
    data: Array.from({ length: 3 }, (_, i) => ({
      id: (Number(page) - 1) * 3 + i + 1,
      name: `Item ${(Number(page) - 1) * 3 + i + 1}`,
    })),
    pagination: { total: 30, page: Number(page), page_size: 3, total_pages: 10 },
  };
};

// ─── Sign In Page ─────────────────────────────────────────────────────
function SignInPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Sign In</h1>
      <p>You were redirected here (session expired or not authenticated).</p>
      <button
        onClick={() => {
          sessionExpired = false;
          window.location.href = "/dashboard/data";
        }}
      >
        Sign back in
      </button>
    </div>
  );
}

// ─── Dashboard Layout (has middleware, same as Dashboard.tsx) ──────────
function DashboardLayout() {
  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Dashboard</h2>
      <nav style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <Link to="/dashboard/data">Data Page</Link>
      </nav>
      <hr />
      <Outlet />
    </div>
  );
}

// ─── Data Page (same pattern as KeywordListPage with useFetcher) ──────
function DataPage() {
  const fetcher = useFetcher();
  const [page, setPage] = useState(1);

  const buildQuery = useCallback(
    (p: number) => `/dashboard/data?page=${p}`,
    [],
  );

  // Initial load via fetcher (same as KeywordListPage)
  useEffect(() => {
    fetcher.load(buildQuery(page));
  }, []);

  const data = fetcher.data as
    | { data: { id: number; name: string }[]; pagination: { total: number; page: number } }
    | undefined;

  return (
    <div>
      <h3>Data Page (useFetcher + route loader)</h3>

      <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
        <button onClick={() => fetcher.load(buildQuery(page))}>
          🔄 Reload
        </button>
        <button
          style={{ background: "red", color: "white", padding: "5px 15px", border: "none", cursor: "pointer" }}
          onClick={() => {
            sessionExpired = true;
            console.log("[ui] Set sessionExpired = true. Now click Reload.");
          }}
        >
          ⚠️ Expire Session
        </button>
      </div>

      <p>
        <strong>Test steps:</strong> 1) Page loads normally → 2) Click "Expire Session" →
        3) Click "Reload" → if crash, it's a React Router bug
      </p>

      {fetcher.state === "loading" && <p>Loading...</p>}

      {data && (
        <div>
          <ul>
            {data.data.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              disabled={page <= 1}
              onClick={() => {
                const next = page - 1;
                setPage(next);
                fetcher.load(buildQuery(next));
              }}
            >
              ← Prev
            </button>
            <span>Page {data.pagination.page}</span>
            <button
              onClick={() => {
                const next = page + 1;
                setPage(next);
                fetcher.load(buildQuery(next));
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Router (same structure as App.tsx) ───────────────────────────────
const router = createBrowserRouter([
  {
    path: "/",
    Component: SignInPage,
  },
  {
    path: "/dashboard",
    Component: DashboardLayout,
    middleware: [authentication],
    errorElement: (
      <div style={{ padding: 20 }}>
        <h1>Something went wrong</h1>
        <Link to="/">Back Home</Link>
      </div>
    ),
    children: [
      {
        path: "data",
        Component: DataPage,
        loader: dataLoader,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
