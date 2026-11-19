import {
  EditorView,
  runScopeHandlers,
  type Panel,
  type ViewUpdate,
} from '@codemirror/view'
import {
  SearchQuery,
  getSearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
  closeSearchPanel,
} from '@codemirror/search'

export class CustomSearchPanel implements Panel {
  readonly dom: HTMLElement
  readonly top = true
  private readonly searchField: HTMLInputElement
  private readonly clearBtn: HTMLButtonElement
  private query: SearchQuery

  constructor(private readonly view: EditorView) {
    this.query = getSearchQuery(view.state)

    const inputWrapper = document.createElement('div')
    inputWrapper.className = 'cm-search-input-wrapper'

    this.searchField = document.createElement('input')
    this.searchField.className = 'cm-textfield'
    this.searchField.name = 'search'
    this.searchField.placeholder = 'Find'
    this.searchField.setAttribute('aria-label', 'Find')
    this.searchField.setAttribute('main-field', 'true')
    this.searchField.autocomplete = 'off'
    this.searchField.autocapitalize = 'off'
    this.searchField.spellcheck = false
    this.searchField.setAttribute('autocorrect', 'off')
    this.searchField.setAttribute('data-form-type', 'other')
    this.searchField.value = this.query.search

    this.clearBtn = document.createElement('button')
    this.clearBtn.type = 'button'
    this.clearBtn.className = 'cm-search-clear'
    this.clearBtn.setAttribute('aria-label', 'Clear search')
    this.clearBtn.textContent = '×'
    this.clearBtn.tabIndex = -1
    this.clearBtn.style.display = this.searchField.value ? 'inline-flex' : 'none'
    this.clearBtn.addEventListener('click', () => {
      this.searchField.value = ''
      this.clearBtn.style.display = 'none'
      this.commit()
      this.searchField.focus()
    })

    this.searchField.addEventListener('input', () => {
      this.clearBtn.style.display = this.searchField.value ? 'inline-flex' : 'none'
      this.commit()
    })
    this.searchField.addEventListener('change', () => this.commit())

    inputWrapper.append(this.searchField, this.clearBtn)

    const nextBtn = document.createElement('button')
    nextBtn.type = 'button'
    nextBtn.className = 'cm-button'
    nextBtn.name = 'next'
    nextBtn.setAttribute('aria-label', 'Next')
    nextBtn.addEventListener('click', () => findNext(this.view))

    const prevBtn = document.createElement('button')
    prevBtn.type = 'button'
    prevBtn.className = 'cm-button'
    prevBtn.name = 'prev'
    prevBtn.setAttribute('aria-label', 'Previous')
    prevBtn.addEventListener('click', () => findPrevious(this.view))

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'cm-button'
    closeBtn.name = 'close'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
    closeBtn.addEventListener('click', () => closeSearchPanel(this.view))

    this.dom = document.createElement('div')
    this.dom.className = 'cm-search'
    this.dom.addEventListener('keydown', (e) => this.onKeydown(e))

    this.dom.append(inputWrapper, nextBtn, prevBtn, closeBtn)
  }

  private commit(): void {
    const query = new SearchQuery({
      search: this.searchField.value,
      caseSensitive: this.query.caseSensitive,
      regexp: this.query.regexp,
      wholeWord: this.query.wholeWord,
    })
    if (!query.eq(this.query)) {
      this.query = query
      this.view.dispatch({ effects: setSearchQuery.of(query) })
    }
  }

  private onKeydown(e: KeyboardEvent): void {
    if (runScopeHandlers(this.view, e, 'search-panel')) {
      e.preventDefault()
    } else if (e.key === 'Enter' && e.target === this.searchField) {
      e.preventDefault()
      if (e.shiftKey) {
        findPrevious(this.view)
      } else {
        findNext(this.view)
      }
    }
  }

  mount(): void {
    this.searchField.focus()
    this.searchField.select()
  }

  update(update: ViewUpdate): void {
    for (const tr of update.transactions) {
      for (const effect of tr.effects) {
        if (effect.is(setSearchQuery) && !effect.value.eq(this.query)) {
          this.query = effect.value
          this.searchField.value = this.query.search
          this.clearBtn.style.display = this.searchField.value ? 'inline-flex' : 'none'
        }
      }
    }
  }
}
