import { redirect } from 'next/navigation';

interface Props {
  params: {
    code: string;
  };
}

export default function ShortJoinPage({ params }: Props) {
  redirect(`/join/${params.code}`);
}
