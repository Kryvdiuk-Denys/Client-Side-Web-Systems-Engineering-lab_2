import './styles/main.scss';
import { Book } from './models/Book';
import { User } from './models/User';
import { Library } from './services/Library';
import { Storage } from './services/Storage';
import { showModal } from './ui/components/Modal';
import { renderLibrary, type ViewState } from './ui/render';
import { Validation } from './utils/validators';

interface SavedState {
  books: SavedBook[];
  users: SavedUser[];
}

interface SavedBook {
  title: string;
  author: string;
  year: number;
  borrowed: boolean;
}

interface SavedUser {
  id: string;
  name: string;
  email: string;
  borrowedBookIds: string[];
}

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Елемент #app не знайдено');

const storage = new Storage('library-management-state');
const savedState = storage.load<SavedState>({ books: [], users: [] });
const books = new Library<Book>((book) => book.getId());
const users = new Library<User>((user) => user.getId());
const pageSize = 5;
const viewState: ViewState = { bookPage: 1, userPage: 1, bookSearch: '', userSearch: '' };

for (const book of savedState.books) books.add(new Book(book.title, book.author, book.year, book.borrowed));
for (const user of savedState.users) users.add(new User(user.name, user.email, user.id, user.borrowedBookIds));

app.innerHTML = `
	<main class="container py-4 py-md-5">
		<header class="mb-4"><p class="eyebrow mb-2">Library workspace</p><h1 class="display-5 fw-bold mb-2">Система управління бібліотекою</h1><p class="lead text-secondary mb-0">Керуйте каталогом книг і читачами в одному місці.</p></header>
		<section class="row g-4" aria-label="Керування бібліотекою">
			<div class="col-12 col-xl-7"><div class="panel h-100"><h2 class="h4 mb-4">Додати книгу</h2><form id="book-form" class="row g-3"><div class="col-12"><label class="form-label" for="book-title">Назва книги</label><input class="form-control" id="book-title" required></div><div class="col-md-7"><label class="form-label" for="book-author">Автор</label><input class="form-control" id="book-author" required></div><div class="col-md-5"><label class="form-label" for="book-year">Рік видання</label><input class="form-control" id="book-year" type="number" min="1" max="2100" required></div><div class="col-12"><button class="btn btn-primary" type="submit">Додати книгу</button></div></form></div></div>
      <div class="col-12 col-xl-5"><div class="panel h-100"><h2 class="h4 mb-4">Додати користувача</h2><form id="user-form" class="row g-3"><div class="col-12"><label class="form-label" for="user-id">ID користувача</label><input class="form-control" id="user-id" type="text" inputmode="numeric" pattern="[0-9]+" required></div><div class="col-12"><label class="form-label" for="user-name">Ім'я</label><input class="form-control" id="user-name" required></div><div class="col-12"><label class="form-label" for="user-email">Email</label><input class="form-control" id="user-email" type="email" required></div><div class="col-12"><button class="btn btn-primary" type="submit">Додати користувача</button></div></form></div></div>
		</section>
    <section class="panel mt-4" aria-labelledby="books-heading"><div class="d-flex justify-content-between align-items-center gap-3 mb-3"><h2 class="h4 mb-0" id="books-heading">Список книг</h2><span class="badge text-bg-light" id="book-count"></span></div><label class="visually-hidden" for="book-search">Пошук книг</label><input class="form-control mb-3" id="book-search" placeholder="Пошук за назвою або автором"><div id="books-list" class="stack-list"></div><nav class="pagination-wrap" aria-label="Пагінація книг" id="book-pagination"></nav></section>
    <section class="panel mt-4" aria-labelledby="users-heading"><div class="d-flex justify-content-between align-items-center gap-3 mb-3"><h2 class="h4 mb-0" id="users-heading">Список користувачів</h2><span class="badge text-bg-light" id="user-count"></span></div><label class="visually-hidden" for="user-search">Пошук користувачів</label><input class="form-control mb-3" id="user-search" placeholder="Пошук за ім’ям або email"><div id="users-list" class="stack-list"></div><nav class="pagination-wrap" aria-label="Пагінація користувачів" id="user-pagination"></nav></section>
		<div class="toast-stack" id="toast-stack" aria-live="polite"></div>
	</main>`;

function notify(message: string): void {
  const stack = document.querySelector<HTMLElement>('#toast-stack');
  if (!stack) return;
  const toast = document.createElement('div');
  toast.className = 'toast-custom';
  toast.textContent = message;
  stack.append(toast);
  window.setTimeout(() => toast.remove(), 4000);
}

function persist(): void {
  storage.save({
    books: books.getAll().map((book) => book.toJSON()),
    users: users.getAll().map((user) => user.toJSON()),
  });
}

function getInput(id: string): HTMLInputElement {
  return document.querySelector<HTMLInputElement>(id) as HTMLInputElement;
}

function render(): void {
  renderLibrary({ books, users, state: viewState, pageSize, persist, notify, render });
}

document.querySelector<HTMLInputElement>('#book-search')?.addEventListener('input', (event) => {
  viewState.bookSearch = (event.target as HTMLInputElement).value;
  viewState.bookPage = 1;
  render();
});

document.querySelector<HTMLInputElement>('#user-search')?.addEventListener('input', (event) => {
  viewState.userSearch = (event.target as HTMLInputElement).value;
  viewState.userPage = 1;
  render();
});

document.querySelector<HTMLFormElement>('#book-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = {
    title: getInput('#book-title').value,
    author: getInput('#book-author').value,
    year: getInput('#book-year').value,
  };
  const result = Validation.validateBookForm(data);
  if (!result.isValid)
    return showModal({ title: 'Помилка валідації', message: result.errors.join('\n'), type: 'error' });
  const book = new Book(data.title.trim(), data.author.trim(), Number(data.year));
  if (books.findById(book.getId()))
    return showModal({ title: 'Книга вже існує', message: 'Книга з такими даними вже є в каталозі.', type: 'info' });
  books.add(book);
  persist();
  getInput('#book-title').form?.reset();
  notify('Книгу додано до каталогу.');
  render();
});

document.querySelector<HTMLFormElement>('#user-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = {
    id: getInput('#user-id').value,
    name: getInput('#user-name').value,
    email: getInput('#user-email').value,
  };
  const result = Validation.validateUserForm(data);
  if (!result.isValid)
    return showModal({ title: 'Помилка валідації', message: result.errors.join('\n'), type: 'error' });
  const user = new User(data.name.trim(), data.email.trim(), data.id.trim());
  if (users.findById(user.getId()))
    return showModal({
      title: 'Користувач вже існує',
      message: 'Користувач із таким email вже зареєстрований.',
      type: 'info',
    });
  users.add(user);
  persist();
  getInput('#user-name').form?.reset();
  notify('Користувача додано.');
  render();
});

render();
