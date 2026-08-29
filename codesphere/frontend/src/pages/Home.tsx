import BackendStatus from '../components/BackendStatus'

export default function Home() {
  return (
    <div className="mx-auto mt-16 max-w-3xl px-4">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
        CodeSphere
      </h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        CSE Coding Learning &amp; Assessment Platform
      </p>
      <div className="mt-6">
        <BackendStatus />
      </div>
    </div>
  )
}
