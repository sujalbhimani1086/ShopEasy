type SectionHeaderProps = {
    title: string;
    subtitle?: string;
};

/**
 * Reusable section header with title and optional subtitle.
 * Provides consistent heading styles across all pages.
 */
export default function SectionHeader({
    title,
    subtitle,
}: SectionHeaderProps) {
    return (
        <div className="section-header animate-fade-in-up">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
        </div>
    );
}
