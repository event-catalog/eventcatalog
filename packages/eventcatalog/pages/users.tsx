import Head from 'next/head';

import UserGrid from '@/components/Grids/UserGrid';

import { useConfig, useUsers } from '@/hooks/EventCatalog';

export default function Page() {
  const { getUsersArray } = useUsers();

  const users = getUsersArray();

  const { title } = useConfig();

  return (
    <>
      <Head>
        <title>{title} - All Users</title>
      </Head>
      <section className="pt-6 pb-24">
        <main className="max-w-7xl mx-auto md:min-h-screen px-4 xl:px-0">
          <div className="relative z-10 flex items-baseline justify-between pt-8 pb-6 ">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Users ({users.length})</h1>
          </div>
          <div className="flex relative min-h-screen">
            <div className="flex-1 ">
              <div className="">
                <div className="max-w-5xl mx-auto px-4 xl:max-w-7xl xl:grid xl:px-0">
                  <div className="xl:col-span-3 xl:pr-8  min-h-screen">
                    {users.length > 0 && (
                      <div className="pb-6">
                        <UserGrid users={users} />  
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </section>
    </>
  );
}
