const features = [
    {
        icon: "🚚",
        title: "Free Shipping",
        description: "Free delivery on all orders with no minimum purchase required.",
        
    },
    {
        icon: "🔒",
        title: "Secure Payment",
        description: "Your transactions are protected with end-to-end encryption.",
    },
    {
        icon: "↩️",
        title: "Easy Returns",
        description: "Hassle-free returns within 30 days of your purchase.",
    },
];

export default function Features() {
    return (
        <div className="features-grid stagger-children">
            {features.map((feature) => (
                <div className="feature-card" key={feature.title}>
                    <span className="feature-icon">{feature.icon}</span>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                </div>
            ))}
        </div>
    );
}