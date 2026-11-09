export function GlobalShell() {
  return (
    <header className="mbe-global-shell" data-tool="titus" data-embedded="true">
      <div className="mbe-shell-wrap">
        <div className="mbe-ribbon-left">
          <a className="mbe-ribbon-brand" href="https://mybibleexplorer.com" aria-label="My Bible Explorer home">
            <img className="mbe-ribbon-logo" src="https://mybibleexplorer.com/assets/my-bible-explorer-logo.png?v=mbe-20260715-1" alt="My Bible Explorer" width={107} height={34}/>
          </a>
          <a className="mbe-ribbon-back" href="https://mybibleexplorer.com/#journeys">
            Back to Library
          </a>
        </div>
        <nav className="mbe-global-nav" aria-label="My Bible Explorer">
          <details className="mbe-library-menu">
            <summary className="mbe-library-toggle">Library</summary>
            <div className="mbe-library-panel">
              <div className="mbe-library-groups">
                <section className="mbe-library-group" aria-labelledby="mbe-books-heading">
                  <p className="mbe-library-heading" id="mbe-books-heading">Books of the Bible</p>
                  <div className="mbe-library-grid mbe-library-grid-books">
                    {/* Filled by the shared menu at https://mybibleexplorer.com/library.js */}
                  </div>
                </section>
                <section className="mbe-library-group" aria-labelledby="mbe-topics-heading">
                  <p className="mbe-library-heading" id="mbe-topics-heading">Topics</p>
                  <div className="mbe-library-grid mbe-library-grid-topics">
                    {/* Filled by the shared menu at https://mybibleexplorer.com/library.js */}
                  </div>
                </section>
              </div>
            </div>
          </details>
          <a className="mbe-ribbon-give" href="https://mybibleexplorer.com/#donate">
            Support
          </a>
        </nav>
      </div>
    </header>
  );
}

export function GlobalFooter() {
  return (
    <footer className="mbe-global-footer" data-tool="titus">
      <div className="mbe-shell-wrap mbe-footer-wrap">
        <a className="mbe-footer-brand" href="https://mybibleexplorer.com" aria-label="My Bible Explorer home">
          <img className="mbe-footer-logo" src="https://mybibleexplorer.com/assets/my-bible-explorer-logo.png?v=mbe-20260715-1" alt="My Bible Explorer" width={107} height={34}/>
        </a>
        <span>Know the Word. Live the Word.</span>
        <span>
          To contact, email <a className="mbe-footer-link" href="mailto:admin@mybibleexplorer.com">admin@mybibleexplorer.com</a>
        </span>
        <a className="mbe-footer-link" href="https://mybibleexplorer.com/#donate">Support</a>
        <span>&copy; {new Date().getFullYear()} My Bible Explorer</span>
      </div>
    </footer>
  );
}
