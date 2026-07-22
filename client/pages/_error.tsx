import type { NextPageContext } from "next";

type Props = {
  statusCode?: number;
};

export default function ErrorPage({ statusCode }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center text-white">
      <div className="max-w-md rounded-2xl border border-white/10 bg-[rgba(10,14,20,0.82)] p-8 shadow-2xl backdrop-blur">
        <h1 className="mb-3 text-xl font-semibold">Page error</h1>
        <p className="text-sm text-white/65">
          {statusCode ? `An error ${statusCode} occurred on the server.` : "An unexpected error occurred."}
        </p>
      </div>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err ? 500 : 404;
  return { statusCode };
};
