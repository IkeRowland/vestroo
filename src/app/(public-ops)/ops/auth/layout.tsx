import { OpsPublicAuthShell } from '@/features/ops/components/OpsPublicAuthShell'

export default function OpsAuthLayout({ children }: { children: React.ReactNode }) {
	return <OpsPublicAuthShell>{children}</OpsPublicAuthShell>
}
