'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from '@/components/toast';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { ExaIcon } from '@/components/icons';

import { login, type LoginActionState } from '../actions';
import { useSession } from 'next-auth/react';
import { BulletIcon } from '@/components/bullet-icon';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: 'idle',
    },
  );

  const { update: updateSession } = useSession();

  useEffect(() => {
    if (state.status === 'failed') {
      toast({
        type: 'error',
        description: 'Invalid credentials!',
      });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: 'Failed validating your submission!',
      });
    } else if (state.status === 'success') {
      setIsSuccessful(true);
      updateSession();
      router.refresh();
    }
  }, [state.status, router, updateSession]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen bg-gradient-to-br from-white via-blue-50/30 to-[#1f40ed]/20 dark:bg-background">
      <div className="flex w-full">
        {/* Left Column - Login Form */}
        <div className="flex w-full lg:w-1/2 items-start pt-12 md:pt-0 md:items-center justify-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12 px-6">
            <div className="flex flex-col items-center justify-center gap-4 px-4 text-center sm:px-16">
              <ExaIcon size={32} />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  Use your email and password to sign in
                </p>
              </div>
            </div>
            <AuthForm action={handleSubmit} defaultEmail={email}>
              <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
              <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
                {"Don't have an account? "}
                <Link
                  href="/register"
                  className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
                >
                  Sign up
                </Link>
                {' for free.'}
              </p>
            </AuthForm>
          </div>
        </div>

        {/* Right Column - Image Area */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative p-8">
          <div className="w-full h-full bg-gradient-to-bl from-[#1f40ed]/10 to-[#1f40ed]/5 rounded-3xl flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
               
                <div className="space-y-2">
                  <div className="flex justify-center pb-24">
                    <BulletIcon className='size-56' />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Find Anything</h2>
                <p className="text-gray-600 max-w-md mx-auto">
                  Let Exa guide you through the depths of human knowledge.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
