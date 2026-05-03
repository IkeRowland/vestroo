export type OpsAccountClientRow = {

	id: string

	name: string

	slug: string

	status: string

	credit_terms_days: number

	credit_limit_zar: number | null

	authorized_email_domains: string[]

	created_at: string

	contract_starts_on: string | null

	contract_ends_on: string | null

}

