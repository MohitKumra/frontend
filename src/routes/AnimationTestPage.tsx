import { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { Bell, Search, Settings, X } from 'lucide-react';

/**
 * Animation Test Page
 * Visual testing ground for all premium animations
 * Access at /animation-test (dev only)
 */
export function AnimationTestPage() {
  const { toggleTheme, theme } = useUIStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-text-primary">
          Premium Motion Design Test
        </h1>
        <p className="text-text-secondary">
          Visual verification of all animation implementations
        </p>
      </div>

      {/* Theme Switch Test */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">Theme Transition</h2>
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm text-text-secondary mb-4">
            Click rapidly to test 60 FPS performance. Should sweep diagonally with no lag.
          </p>
          <button
            onClick={() => toggleTheme({ animate: true })}
            className="px-6 py-3 rounded-xl font-semibold text-white"
            style={{ background: 'var(--gradient-accent)' }}
          >
            Toggle Theme (Current: {theme})
          </button>
        </div>
      </section>

      {/* Button Interactions */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">Button Interactions</h2>
        <div className="p-6 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-4" 
             style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <button className="px-6 py-3 rounded-xl font-semibold text-white hover:shadow-lg transition-all duration-150"
                  style={{ background: 'var(--gradient-accent)' }}>
            Primary Button
          </button>
          <button className="px-6 py-3 rounded-xl font-semibold border hover:shadow-lg transition-all duration-150"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            Secondary Button
          </button>
          <button className="px-6 py-3 rounded-xl font-semibold text-red-500 border border-red-200 hover:shadow-lg transition-all duration-150">
            Danger Button
          </button>
        </div>
      </section>

      {/* Card Hover Effects */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">Card Hover Effects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card-hover p-6 rounded-2xl border cursor-pointer"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
                   style={{ background: 'var(--gradient-accent)' }}>
                <Bell className="text-white" size={20} />
              </div>
              <h3 className="font-bold text-text-primary mb-2">Card Title {i}</h3>
              <p className="text-sm text-text-secondary">
                Hover to see premium lift animation with shadow
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Modal Test */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">Modal Animation</h2>
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 rounded-xl font-semibold text-white"
            style={{ background: 'var(--gradient-accent)' }}
          >
            Open Modal
          </button>
        </div>
      </section>

      {/* Dropdown Test */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">Dropdown Animation</h2>
        <div className="p-6 rounded-2xl border relative" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="px-6 py-3 rounded-xl font-semibold border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            Toggle Dropdown
          </button>
          
          {dropdownOpen && (
            <div className="dropdown-enter absolute top-full mt-2 left-6 w-64 p-3 rounded-xl border shadow-lg z-50"
                 style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              {['Option 1', 'Option 2', 'Option 3'].map((opt) => (
                <div key={opt} className="px-4 py-2 rounded-lg hover:bg-accent/10 cursor-pointer text-text-primary">
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Toast Test */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">Toast Animation</h2>
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <button
            onClick={showToast}
            className="px-6 py-3 rounded-xl font-semibold text-white"
            style={{ background: 'var(--gradient-accent)' }}
          >
            Show Toast
          </button>
        </div>
      </section>

      {/* List Stagger */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">List Stagger Animation</h2>
        <div className="p-6 rounded-2xl border stagger" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="list-item-stagger flex items-center gap-3 p-4 rounded-xl mb-2 border"
                 style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                   style={{ background: 'var(--gradient-accent)' }}>
                <span className="text-white font-bold">{i}</span>
              </div>
              <div>
                <p className="font-semibold text-text-primary">List Item {i}</p>
                <p className="text-sm text-text-secondary">Staggered entrance animation</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Input Focus */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">Input Focus Animation</h2>
        <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <input
            type="text"
            placeholder="Focus to see animation"
            className="w-full px-4 py-3 rounded-xl border outline-none transition-all duration-150 focus:ring-2 focus:ring-accent"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
          <textarea
            placeholder="Textarea with focus animation"
            className="w-full px-4 py-3 rounded-xl border outline-none transition-all duration-150 focus:ring-2 focus:ring-accent resize-none"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            rows={3}
          />
        </div>
      </section>

      {/* Performance Note */}
      <section className="p-6 rounded-2xl border" style={{ background: 'var(--color-accent-subtle)', borderColor: 'var(--color-accent-border)' }}>
        <h3 className="font-bold text-text-primary mb-2">Performance Testing</h3>
        <p className="text-sm text-text-secondary mb-2">
          Open Chrome DevTools → Performance tab → Record → Test animations → Check for:
        </p>
        <ul className="text-sm text-text-secondary space-y-1 ml-4">
          <li>✓ Consistent 60 FPS (green bars)</li>
          <li>✓ No red/yellow bars (no reflow/repaint)</li>
          <li>✓ Each frame under 16.67ms</li>
        </ul>
      </section>

      {/* Modal Overlay */}
      {modalOpen && (
        <div className="modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
             onClick={() => setModalOpen(false)}>
          <div className="modal-content-enter max-w-md w-full p-6 rounded-2xl shadow-2xl"
               style={{ background: 'var(--color-surface)' }}
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-text-primary">Modal Animation Test</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
              >
                <X size={20} className="text-text-secondary" />
              </button>
            </div>
            <p className="text-text-secondary mb-6">
              This modal uses a premium entrance animation inspired by macOS.
              Scale from 0.94 to 1.0 with translateY and blur.
            </p>
            <button
              onClick={() => setModalOpen(false)}
              className="w-full px-6 py-3 rounded-xl font-semibold text-white"
              style={{ background: 'var(--gradient-accent)' }}
            >
              Close Modal
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastVisible && (
        <div className="toast-slide-in fixed top-6 right-6 z-50 max-w-sm p-4 rounded-xl shadow-lg border flex items-start gap-3"
             style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: 'var(--gradient-success)' }}>
            <Bell size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-text-primary">Toast Notification</p>
            <p className="text-sm text-text-secondary">Premium slide-in animation</p>
          </div>
        </div>
      )}
    </div>
  );
}
