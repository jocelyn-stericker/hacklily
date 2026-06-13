import { Button } from './button'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

export function TooltipButton({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button {...props} aria-label={label}>
            {children}
          </Button>
        }
      />
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  )
}
