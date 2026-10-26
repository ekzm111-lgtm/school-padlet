import { redirect } from 'next/navigation';

interface Props {
  params: {
    code: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function ShortJoinPage({ params, searchParams }: Props) {
  const bParam = searchParams?.b ? `?b=${encodeURIComponent(String(searchParams.b))}` : '';
  redirect(`/join/${params.code}${bParam}`);
}
