import './styles/main.scss';
import { Book } from './models/Book';
import { User } from './models/User';
import { Library } from './services/Library';
import { Storage } from './services/Storage';
import { showModal } from './ui/components/Modal';
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
let bookPage = 1;
let userPage = 1;
let bookSearch = '';
let userSearch = '';

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

function renderPagination(
  container: HTMLElement,
  page: number,
  totalItems: number,
  onPageChange: (nextPage: number) => void,
): void {
  container.replaceChildren();
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return;

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn-sm ${pageNumber === page ? 'btn-primary' : 'btn-outline-secondary'}`;
    button.textContent = String(pageNumber);
    button.setAttribute('aria-label', `Сторінка ${pageNumber}`);
    button.setAttribute('aria-current', pageNumber === page ? 'page' : 'false');
    button.addEventListener('click', () => onPageChange(pageNumber));
    container.append(button);
  }
}

function render(): void {
  const bookList = document.querySelector<HTMLElement>('#books-list');
  const userList = document.querySelector<HTMLElement>('#users-list');
  const bookCount = document.querySelector<HTMLElement>('#book-count');
  const userCount = document.querySelector<HTMLElement>('#user-count');
  const bookPagination = document.querySelector<HTMLElement>('#book-pagination');
  const userPagination = document.querySelector<HTMLElement>('#user-pagination');
  if (!bookList || !userList || !bookCount || !userCount || !bookPagination || !userPagination) return;

  const filteredBooks = books.getAll().filter((book) => {
    const query = bookSearch.trim().toLocaleLowerCase();
    return !query || `${book.getTitle()} ${book.getAuthor()}`.toLocaleLowerCase().includes(query);
  });
  const bookPageCount = Math.max(1, Math.ceil(filteredBooks.length / pageSize));
  bookPage = Math.min(bookPage, bookPageCount);
  const visibleBooks = filteredBooks.slice((bookPage - 1) * pageSize, bookPage * pageSize);
  bookList.replaceChildren();
  bookCount.textContent = `${filteredBooks.length}/${books.size} ${books.size === 1 ? 'книга' : 'книг'}`;
  for (const book of visibleBooks) {
    const row = document.createElement('div');
    row.className = 'list-item d-flex flex-wrap justify-content-between align-items-center gap-3';
    const text = document.createElement('span');
    text.textContent = book.toString();
    row.append(text);
    const controls = document.createElement('div');
    controls.className = 'd-flex flex-wrap gap-2';
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-outline-danger btn-sm';
    deleteButton.textContent = 'Видалити';
    deleteButton.addEventListener('click', () => {
      const owner = users.find((user) => user.getBorrowedBookIds().includes(book.getId()));
      owner?.returnBook(book.getId());
      books.remove(book);
      persist();
      notify(`Книгу «${book.getTitle()}» видалено.`);
      render();
    });
    controls.append(deleteButton);
    if (book.isBorrowed()) {
      const owner = users.find((user) => user.getBorrowedBookIds().includes(book.getId()));
      const returnButton = document.createElement('button');
      returnButton.className = 'btn btn-outline-secondary btn-sm';
      returnButton.textContent = `Повернути${owner ? ` (${owner.getName()})` : ''}`;
      returnButton.addEventListener('click', () => {
        book.returnBook();
        owner?.returnBook(book.getId());
        persist();
        notify(`Книгу «${book.getTitle()}» повернуто.`);
        render();
      });
      controls.append(returnButton);
    } else if (users.size) {
      const select = document.createElement('select');
      select.className = 'form-select form-select-sm';
      select.setAttribute('aria-label', `Оберіть користувача для книги ${book.getTitle()}`);
      select.innerHTML = '<option value="">Оберіть користувача</option>';
      for (const user of users.getAll()) {
        const option = document.createElement('option');
        option.value = user.getId();
        option.textContent = `${user.getName()} (${user.getBorrowedBookIds().length}/3)`;
        select.append(option);
      }
      const borrowButton = document.createElement('button');
      borrowButton.className = 'btn btn-primary btn-sm';
      borrowButton.textContent = 'Позичити';
      borrowButton.addEventListener('click', () => {
        const user = users.findById(select.value);
        if (!user) return notify('Спочатку оберіть користувача.');
        if (user.getBorrowedBookIds().length >= 3) {
          showModal({
            title: 'Ліміт позик',
            message: `${user.getName()} вже позичив(ла) 3 книги. Четверта позика недоступна.`,
            type: 'error',
          });
          return;
        }
        showModal({
          title: 'Підтвердити позику',
          message: `${user.getName()} хоче позичити «${book.getTitle()}».`,
          confirmLabel: 'Позичити',
          onConfirm: () => {
            book.borrow();
            user.borrowBook(book.getId());
            persist();
            notify(`Книгу «${book.getTitle()}» успішно позичено.`);
            render();
          },
        });
      });
      controls.append(select, borrowButton);
    }
    row.append(controls);
    bookList.append(row);
  }
  if (!visibleBooks.length)
    bookList.innerHTML = `<div class="empty-state">${books.size ? 'За запитом нічого не знайдено.' : 'Книги ще не додані.'}</div>`;
  renderPagination(bookPagination, bookPage, filteredBooks.length, (nextPage) => {
    bookPage = nextPage;
    render();
  });

  const filteredUsers = users.getAll().filter((user) => {
    const query = userSearch.trim().toLocaleLowerCase();
    return !query || `${user.getName()} ${user.getEmail()}`.toLocaleLowerCase().includes(query);
  });
  const userPageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  userPage = Math.min(userPage, userPageCount);
  const visibleUsers = filteredUsers.slice((userPage - 1) * pageSize, userPage * pageSize);
  userList.replaceChildren();
  userCount.textContent = `${filteredUsers.length}/${users.size} ${users.size === 1 ? 'користувач' : 'користувачів'}`;
  for (const user of visibleUsers) {
    const row = document.createElement('div');
    row.className = 'list-item d-flex flex-wrap justify-content-between align-items-center gap-3';
    const text = document.createElement('span');
    text.textContent = `ID ${user.getId()} · ${user.getName()} · ${user.getEmail()} · Позик: ${user.getBorrowedBookIds().length}/3`;
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-outline-danger btn-sm';
    deleteButton.textContent = 'Видалити';
    deleteButton.addEventListener('click', () => {
      for (const borrowedBookId of user.getBorrowedBookIds()) books.findById(borrowedBookId)?.returnBook();
      users.remove(user);
      persist();
      notify(`Користувача «${user.getName()}» видалено.`);
      render();
    });
    row.append(text, deleteButton);
    userList.append(row);
  }
  if (!visibleUsers.length)
    userList.innerHTML = `<div class="empty-state">${users.size ? 'За запитом нічого не знайдено.' : 'Користувачі ще не додані.'}</div>`;
  renderPagination(userPagination, userPage, filteredUsers.length, (nextPage) => {
    userPage = nextPage;
    render();
  });
}

document.querySelector<HTMLInputElement>('#book-search')?.addEventListener('input', (event) => {
  bookSearch = (event.target as HTMLInputElement).value;
  bookPage = 1;
  render();
});

document.querySelector<HTMLInputElement>('#user-search')?.addEventListener('input', (event) => {
  userSearch = (event.target as HTMLInputElement).value;
  userPage = 1;
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
