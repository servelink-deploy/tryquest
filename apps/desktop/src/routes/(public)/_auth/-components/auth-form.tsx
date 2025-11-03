import { Button } from '@conar/ui/components/button'
import { LoadingContent } from '@conar/ui/components/custom/loading-content'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@conar/ui/components/form'
import { Input } from '@conar/ui/components/input'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { RiEyeLine, RiEyeOffLine } from '@remixicon/react'
import { Link, useNavigate } from '@tanstack/react-router'
import { type } from 'arktype'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { authClient, bearerToken, successAuthToast } from '~/lib/auth'
import { handleError } from '~/lib/error'

type Type = 'sign-up' | 'sign-in'

const schema = type({
  email: 'string.email',
  password: 'string >= 8',
  name: 'string?',
})

// Google et GitHub OAuth temporairement désactivés

export function AuthForm({ type }: { type: Type }) {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const emailRef = useRef<HTMLInputElement>(null)

  const form = useForm<typeof schema.infer>({
    resolver: arktypeResolver(
      type === 'sign-up'
        ? schema.and({ name: 'string' })
        : schema,
    ),
    defaultValues: {
      email: '',
      password: '',
      name: '',
    },
  })

  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus()
    }
  }, [emailRef])

  const submit = async (values: typeof schema.infer) => {
    const { error, data } = type === 'sign-up'
      ? await authClient.signUp.email({
          email: values.email,
          password: values.password,
          name: values.name!,
        })
      : await authClient.signIn.email({
          email: values.email,
          password: values.password,
        })

    if (error || !(data && data.token)) {
      if (data && !data.token) {
        toast.error('In some reason, we were not able to sign you in. Please try again later.')
        return
      }

      if (error!.code === 'USER_ALREADY_EXISTS') {
        toast.error('User already exists. Please sign in or use a different email address.', {
          action: {
            label: 'Sign in',
            onClick: () => {
              navigate({ to: '/sign-in' })
            },
          },
        })
      }
      else {
        handleError(error)
      }
      return
    }

    bearerToken.set(data.token)
    successAuthToast(type === 'sign-up')
  }

  return (
    <>
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field: { ref, ...field } }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="example@gmail.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    spellCheck="false"
                    required
                    ref={(e) => {
                      ref(e)
                      emailRef.current = e
                    }}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {type === 'sign-up' && (
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      autoComplete="name"
                      spellCheck="false"
                      required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  {type === 'sign-in' && (
                    <Button variant="link" size="xs" className="text-muted-foreground" asChild>
                      <Link to="/forgot-password">
                        Forgot password?
                      </Link>
                    </Button>
                  )}
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="••••••••"
                      type={showPassword ? 'text' : 'password'}
                      autoCapitalize="none"
                      autoComplete="password"
                      spellCheck="false"
                      required
                      className="pe-10"
                      {...field}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 size-7 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword
                        ? (
                            <RiEyeOffLine className="size-4" />
                          )
                        : (
                            <RiEyeLine className="size-4" />
                          )}
                      <span className="sr-only">
                        {showPassword ? 'Hide password' : 'Show password'}
                      </span>
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            className="w-full"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            <LoadingContent loading={form.formState.isSubmitting}>
              {type === 'sign-up' ? 'Get started' : 'Sign in'}
            </LoadingContent>
          </Button>
        </form>
      </Form>
    </>
  )
}
