import { WorldMapSection } from '@/components/ui';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-harvest-green-50 to-white py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-harvest-green-900 mb-6">
              Harvest Finance
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Decentralized yield optimization for the global DeFi ecosystem. 
              Earn sustainable yields across multiple blockchain networks.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="#"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-harvest-green-600 rounded-full hover:bg-harvest-green-700 transition-colors"
              >
                Launch App
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-harvest-green-700 bg-white border border-harvest-green-200 rounded-full hover:bg-harvest-green-50 transition-colors"
              >
                Read Docs
              </a>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-harvest-green-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-harvest-green-300/20 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Automated Yield',
                description: 'Sophisticated strategies that automatically optimize your yields across multiple protocols.',
                icon: '🌾',
              },
              {
                title: 'Multi-Chain',
                description: 'Deploy capital across Ethereum, Arbitrum, Polygon, and more with a single click.',
                icon: '⛓️',
              },
              {
                title: 'Secure & Audited',
                description: 'Built with security in mind. Multiple audits and a robust risk management system.',
                icon: '🔒',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-harvest-green-50 border border-harvest-green-100 hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-harvest-green-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* World Map Section */}
      <WorldMapSection
        title="Global Reach"
        subtitle="Harvest Finance connects users from around the world, providing decentralized yield optimization across multiple blockchain networks."
      />

      {/* Stats Section */}
      <section className="py-16 md:py-24 bg-harvest-green-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '$500M+', label: 'Total Value Locked' },
              { value: '50K+', label: 'Active Users' },
              { value: '12+', label: 'Supported Chains' },
              { value: '$100M+', label: 'Yield Generated' },
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-harvest-green-300">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-white to-harvest-green-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-harvest-green-900 mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Connect your wallet and start earning optimized yields on your crypto assets today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-harvest-green-600 rounded-full hover:bg-harvest-green-700 transition-colors"
            >
              Connect Wallet
            </a>
            <a
              href="#"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-harvest-green-700 bg-white border-2 border-harvest-green-200 rounded-full hover:bg-harvest-green-50 transition-colors"
            >
              View Strategies
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-harvest-green-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">🌾 Harvest Finance</h3>
              <p className="text-harvest-green-300">
                Decentralized yield optimization for everyone.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-harvest-green-300">
                <li><a href="#" className="hover:text-white transition-colors">Vaults</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Strategies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Farms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-harvest-green-300">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Audit Reports</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bug Bounty</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-harvest-green-300">
                <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Forum</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-harvest-green-800 text-center text-harvest-green-400">
            <p>&copy; {new Date().getFullYear()} Harvest Finance. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
