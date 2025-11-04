import { Button } from '@conar/ui/components/button'


export function DownloadButton({ fallback }: { fallback?: React.ReactNode }) {

  return (
    <Button size="lg" className="flex items-center justify-center gap-2 text-white">
      <a href="https://tryquest-images.servel.ink/releases/TryQuest-Windows-0.23.0-Setup.exe" className='text-white' style={{
        color: "white"
      }}>
        Download for Windows
      </a>
    </Button>
  )
}
