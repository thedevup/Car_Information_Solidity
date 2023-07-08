function switchSection(sectionId) {
  // Hide all sections
  const sections = document.getElementsByClassName('section');
  for (let i = 0; i < sections.length; i++) {
    sections[i].style.display = 'none';
  }

  // Show the selected section
  document.getElementById(sectionId).style.display = 'block';
}

// Register event listeners for menu items
const menuItems = document.getElementsByClassName("header-menu")[0].getElementsByTagName("a");
for (let i = 0; i < menuItems.length; i++) {
  menuItems[i].addEventListener("click", function (event) {
    event.preventDefault();

    for (let j = 0; j < menuItems.length; j++) {
      menuItems[j].classList.remove("active");
    }

    this.classList.add("active");

    const targetSection = this.getAttribute("data-section");
    if (targetSection) {
      switchSection(targetSection);
    }
  });
}
