'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { OpsAccountClientFormDialog } from '@/features/ops/components/OpsAccountClientFormDialog'

export function OpsAddAccountClientButton() {
	const [open, setOpen] = useState(false)
	return (
		<>
			<Button
				type="button"
				variant="default"
				size="sm"
				className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
				onClick={() => setOpen(true)}
			>
				<Plus className="h-4 w-4" aria-hidden />
				Create account client
			</Button>
			{open ? <OpsAccountClientFormDialog mode="create" onClose={() => setOpen(false)} /> : null}
		</>
	)
}
